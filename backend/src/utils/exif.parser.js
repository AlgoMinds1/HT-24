/**
 * @file exif.parser.js
 * Pure-JS EXIF metadata extractor for TruthLens image ingestion pipeline.
 * Zero external dependencies — parses raw JPEG APP1 binary segments directly.
 *
 * Extracts:
 *  - DateTimeOriginal / DateTime (capture timestamp)
 *  - Make / Model (camera or device)
 *  - Software (editing software → manipulation risk signal)
 *  - GPS Latitude / Longitude (decimal degrees + Google Maps URL)
 *  - ImageWidth / ImageHeight (resolution sanity check)
 *  - Orientation (flipped / rotated flag)
 */

// ---------------------------------------------------------------------------
// EXIF tag dictionary — only the fields relevant for fact-checking
// ---------------------------------------------------------------------------
const IFD0_TAGS = {
  0x010F: 'make',
  0x0110: 'model',
  0x0112: 'orientation',
  0x0131: 'software',
  0x0132: 'dateTime',
  0x0100: 'imageWidth',
  0x0101: 'imageHeight'
};

const EXIF_SUB_TAGS = {
  0x9003: 'dateTimeOriginal',
  0x9004: 'dateTimeDigitized',
  0xA002: 'exifImageWidth',
  0xA003: 'exifImageHeight'
};

const GPS_TAGS = {
  0x0001: 'gpsLatitudeRef',
  0x0002: 'gpsLatitude',
  0x0003: 'gpsLongitudeRef',
  0x0004: 'gpsLongitude',
  0x0006: 'gpsAltitude'
};

// TIFF type definitions: { size in bytes }
const TIFF_TYPES = {
  1:  1,   // BYTE
  2:  1,   // ASCII
  3:  2,   // SHORT
  4:  4,   // LONG
  5:  8,   // RATIONAL (two LONGs)
  7:  1,   // UNDEFINED
  9:  4,   // SLONG
  10: 8    // SRATIONAL
};

// ---------------------------------------------------------------------------
// Low-level binary read helpers
// ---------------------------------------------------------------------------

function readUInt16(buf, offset, le) {
  return le ? buf.readUInt16LE(offset) : buf.readUInt16BE(offset);
}

function readUInt32(buf, offset, le) {
  return le ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
}

function readInt32(buf, offset, le) {
  return le ? buf.readInt32LE(offset) : buf.readInt32BE(offset);
}

/**
 * Reads a typed EXIF value from the buffer at the given absolute offset.
 */
function readTypedValue(buf, absOffset, type, count) {
  const le = true; // caller passes already-resolved absolute offset; endianness handled elsewhere
  // We'll pass endianness via closure — reworked in parseIFD below.
  return null;
}

// ---------------------------------------------------------------------------
// IFD parser
// ---------------------------------------------------------------------------

/**
 * Parses an IFD (Image File Directory) and returns a flat key→value map.
 *
 * @param {Buffer}  buf         - Full JPEG buffer
 * @param {number}  ifdOffset   - Absolute offset of this IFD in buf
 * @param {number}  tiffBase    - Absolute offset of the TIFF header in buf (all TIFF offsets are relative to this)
 * @param {boolean} le          - Little-endian flag
 * @param {Object}  tagDict     - Map of tag ID → field name
 * @returns {Object}
 */
function parseIFD(buf, ifdOffset, tiffBase, le, tagDict) {
  const result = {};

  if (ifdOffset + 2 > buf.length) return result;

  const entryCount = readUInt16(buf, ifdOffset, le);
  if (entryCount > 500) return result; // sanity guard against corrupt data

  for (let i = 0; i < entryCount; i++) {
    const entry = ifdOffset + 2 + i * 12;
    if (entry + 12 > buf.length) break;

    const tagId   = readUInt16(buf, entry,     le);
    const type    = readUInt16(buf, entry + 2, le);
    const count   = readUInt32(buf, entry + 4, le);

    const fieldName = tagDict[tagId];
    if (!fieldName) continue;

    const typeSize = TIFF_TYPES[type];
    if (!typeSize) continue;

    const dataSize = typeSize * count;
    let dataOffset;
    if (dataSize <= 4) {
      dataOffset = entry + 8;
    } else {
      const rawOff = readUInt32(buf, entry + 8, le);
      dataOffset = tiffBase + rawOff;
    }

    if (dataOffset + dataSize > buf.length) continue;

    // Read value based on type
    let value = null;

    if (type === 2) {
      // ASCII string — read count bytes, trim null terminators
      value = buf.toString('utf8', dataOffset, dataOffset + count).replace(/\0+$/, '').trim();
    } else if (type === 1 || type === 7) {
      // BYTE / UNDEFINED — return single byte or array
      if (count === 1) {
        value = buf[dataOffset];
      } else {
        value = Array.from(buf.slice(dataOffset, dataOffset + count));
      }
    } else if (type === 3) {
      // SHORT
      if (count === 1) {
        value = readUInt16(buf, dataOffset, le);
      } else {
        value = [];
        for (let j = 0; j < count; j++) {
          value.push(readUInt16(buf, dataOffset + j * 2, le));
        }
      }
    } else if (type === 4) {
      // LONG
      if (count === 1) {
        value = readUInt32(buf, dataOffset, le);
      } else {
        value = [];
        for (let j = 0; j < count; j++) {
          value.push(readUInt32(buf, dataOffset + j * 4, le));
        }
      }
    } else if (type === 5) {
      // RATIONAL — array of numerator/denominator pairs → decimal
      const vals = [];
      for (let j = 0; j < count; j++) {
        const num = readUInt32(buf, dataOffset + j * 8,     le);
        const den = readUInt32(buf, dataOffset + j * 8 + 4, le);
        vals.push(den !== 0 ? num / den : 0);
      }
      value = vals.length === 1 ? vals[0] : vals;
    } else if (type === 9) {
      // SLONG
      value = readInt32(buf, dataOffset, le);
    } else if (type === 10) {
      // SRATIONAL
      const snum = readInt32(buf, dataOffset,     le);
      const sden = readInt32(buf, dataOffset + 4, le);
      value = sden !== 0 ? snum / sden : 0;
    }

    if (value !== null && value !== '') {
      result[fieldName] = value;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API — EXIF extraction
// ---------------------------------------------------------------------------

/**
 * Extracts EXIF metadata from a JPEG buffer.
 * Returns null for non-JPEG images or images without EXIF data.
 *
 * @param {Buffer} buffer
 * @returns {Object|null} exif fields, or null
 */
export function extractExif(buffer) {
  try {
    if (!buffer || buffer.length < 12) return null;

    // Must be JPEG
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null;

    // --- Locate JPEG APP1 segment containing EXIF data ---
    let offset = 2;
    let tiffBase = -1;

    while (offset < buffer.length - 4) {
      if (buffer[offset] !== 0xFF) {
        offset++;
        continue;
      }

      const marker = buffer[offset + 1];

      // APP1 = 0xFFE1
      if (marker === 0xE1) {
        const segLength = buffer.readUInt16BE(offset + 2); // segment length (includes length field)
        const payloadStart = offset + 4;

        // Check for "Exif\0\0" header (6 bytes)
        if (payloadStart + 6 <= buffer.length) {
          const exifHeader = buffer.toString('ascii', payloadStart, payloadStart + 4);
          if (exifHeader === 'Exif') {
            tiffBase = payloadStart + 6; // TIFF header begins after "Exif\0\0"
            break;
          }
        }

        // Not EXIF APP1 — skip segment
        offset += 2 + segLength;
      } else if (marker === 0xD9 || marker === 0xDA) {
        // EOI or SOS — stop scanning
        break;
      } else if (marker >= 0xE0 && marker <= 0xFE) {
        // Other APPn / marker with length
        if (offset + 3 < buffer.length) {
          const segLength = buffer.readUInt16BE(offset + 2);
          offset += 2 + segLength;
        } else {
          break;
        }
      } else {
        offset++;
      }
    }

    if (tiffBase < 0 || tiffBase + 8 > buffer.length) return null;

    // --- Parse TIFF header ---
    const byteOrder = buffer.toString('ascii', tiffBase, tiffBase + 2);
    const le = byteOrder === 'II'; // II = Intel = little-endian; MM = Motorola = big-endian

    const magic = readUInt16(buffer, tiffBase + 2, le);
    if (magic !== 42) return null; // Not a valid TIFF header

    const ifd0Abs = tiffBase + readUInt32(buffer, tiffBase + 4, le);

    // --- Parse IFD0 ---
    const ifd0 = parseIFD(buffer, ifd0Abs, tiffBase, le, IFD0_TAGS);

    // --- Find ExifIFD (0x8769) and GPS IFD (0x8825) sub-directory offsets ---
    let exifSubIfdAbs = -1;
    let gpsIfdAbs = -1;

    if (ifd0Abs + 2 <= buffer.length) {
      const entryCount = readUInt16(buffer, ifd0Abs, le);
      for (let i = 0; i < Math.min(entryCount, 200); i++) {
        const entry = ifd0Abs + 2 + i * 12;
        if (entry + 12 > buffer.length) break;
        const tagId = readUInt16(buffer, entry, le);
        if (tagId === 0x8769) {
          exifSubIfdAbs = tiffBase + readUInt32(buffer, entry + 8, le);
        } else if (tagId === 0x8825) {
          gpsIfdAbs = tiffBase + readUInt32(buffer, entry + 8, le);
        }
      }
    }

    // --- Parse Exif sub-IFD (DateTimeOriginal, pixel dimensions) ---
    let exifSub = {};
    if (exifSubIfdAbs > 0 && exifSubIfdAbs < buffer.length) {
      exifSub = parseIFD(buffer, exifSubIfdAbs, tiffBase, le, EXIF_SUB_TAGS);
    }

    // --- Parse GPS IFD ---
    let gpsRaw = {};
    if (gpsIfdAbs > 0 && gpsIfdAbs < buffer.length) {
      gpsRaw = parseIFD(buffer, gpsIfdAbs, tiffBase, le, GPS_TAGS);
    }

    // --- Convert GPS rationals → decimal degrees ---
    let gps = null;
    if (gpsRaw.gpsLatitude && gpsRaw.gpsLongitude) {
      const toDecimal = (v) => {
        const arr = Array.isArray(v) ? v : [v];
        return (arr[0] || 0) + (arr[1] || 0) / 60 + (arr[2] || 0) / 3600;
      };

      const latDec = toDecimal(gpsRaw.gpsLatitude)  * (gpsRaw.gpsLatitudeRef  === 'S' ? -1 : 1);
      const lonDec = toDecimal(gpsRaw.gpsLongitude) * (gpsRaw.gpsLongitudeRef === 'W' ? -1 : 1);

      if (Math.abs(latDec) > 0.001 || Math.abs(lonDec) > 0.001) {
        const lat6 = Math.round(latDec * 1_000_000) / 1_000_000;
        const lon6 = Math.round(lonDec * 1_000_000) / 1_000_000;
        gps = {
          latitude:  lat6,
          longitude: lon6,
          ref: `${gpsRaw.gpsLatitudeRef || 'N'}${gpsRaw.gpsLongitudeRef || 'E'}`,
          mapsUrl: `https://maps.google.com/?q=${lat6},${lon6}`
        };
      }
    }

    return {
      make:              ifd0.make              || null,
      model:             ifd0.model             || null,
      software:          ifd0.software          || null,
      dateTimeOriginal:  exifSub.dateTimeOriginal || ifd0.dateTime || null,
      dateTimeDigitized: exifSub.dateTimeDigitized || null,
      orientation:       ifd0.orientation       || null,
      imageWidth:        ifd0.imageWidth  || exifSub.exifImageWidth  || null,
      imageHeight:       ifd0.imageHeight || exifSub.exifImageHeight || null,
      gps
    };

  } catch {
    // EXIF parsing is strictly best-effort — never crash the pipeline
    return null;
  }
}

// ---------------------------------------------------------------------------
// Signal analyser — converts raw EXIF into actionable fact-checking signals
// ---------------------------------------------------------------------------

const EDITING_SOFTWARE_KEYWORDS = [
  'photoshop', 'lightroom', 'gimp', 'affinity', 'snapseed', 'facetune',
  'picsart', 'pixelmator', 'illustrator', 'paint.net', 'capture one',
  'darktable', 'rawtherapee', 'luminar', 'photo editor', 'inpaint'
];

const SCREENSHOT_SOFTWARE_KEYWORDS = [
  'screenshot', 'snagit', 'snip', 'greenshot', 'lightshot', 'sharex',
  'obs', 'screenpresso', 'monosnap', 'gyazo'
];

const ORIENTATION_LABELS = {
  1: 'Normal',
  2: 'Mirrored horizontally',
  3: 'Rotated 180°',
  4: 'Mirrored vertically',
  5: 'Mirrored + Rotated 90° CW',
  6: 'Rotated 90° CW',
  7: 'Mirrored + Rotated 90° CCW',
  8: 'Rotated 90° CCW'
};

/**
 * Analyses EXIF data and generates structured fact-checking signals.
 *
 * @param {Object|null} exif          - Output of extractExif()
 * @param {string}      [claimedDate] - Date string from the claim (if any) for cross-reference
 * @returns {{
 *   hasExif: boolean,
 *   manipulationRisk: 'LOW'|'MEDIUM'|'HIGH'|'UNKNOWN',
 *   signals: Array<{type: string, value: any, risk: string}>,
 *   warnings: string[],
 *   summary: string
 * }}
 */
export function analyzeExifSignals(exif, claimedDate = null) {
  if (!exif) {
    return {
      hasExif: false,
      manipulationRisk: 'UNKNOWN',
      signals: [],
      warnings: [
        'No EXIF metadata found. The image may be a screenshot, a social media re-share, ' +
        'or a file with metadata deliberately stripped — common in edited viral forwards.'
      ],
      summary: 'No EXIF metadata available for analysis.'
    };
  }

  const signals = [];
  const warnings = [];
  let manipulationRisk = 'LOW';

  // ── 1. Software ────────────────────────────────────────────────────────────
  if (exif.software) {
    const sw = exif.software.toLowerCase();
    const isEditing    = EDITING_SOFTWARE_KEYWORDS.some(k => sw.includes(k));
    const isScreenshot = SCREENSHOT_SOFTWARE_KEYWORDS.some(k => sw.includes(k));

    if (isEditing) {
      manipulationRisk = 'HIGH';
      warnings.push(
        `⚠️ Editing software detected: "${exif.software}". ` +
        'This image may have been post-processed or digitally manipulated.'
      );
      signals.push({ type: 'EDITING_SOFTWARE', value: exif.software, risk: 'HIGH' });
    } else if (isScreenshot) {
      signals.push({ type: 'SCREENSHOT_TOOL', value: exif.software, risk: 'LOW' });
      warnings.push(`Image was captured using a screenshot tool (${exif.software}).`);
    } else {
      signals.push({ type: 'SOFTWARE', value: exif.software, risk: 'LOW' });
    }
  }

  // ── 2. Camera Make / Model ─────────────────────────────────────────────────
  if (exif.make && exif.model) {
    signals.push({ type: 'CAMERA_DEVICE', value: `${exif.make} ${exif.model}`, risk: 'LOW' });
  } else if (!exif.make && !exif.model) {
    warnings.push(
      'No camera or device information in EXIF. Likely a screenshot, social media re-share, or digitally generated image.'
    );
    signals.push({ type: 'NO_CAMERA_INFO', value: null, risk: 'MEDIUM' });
    if (manipulationRisk === 'LOW') manipulationRisk = 'MEDIUM';
  }

  // ── 3. DateTimeOriginal ────────────────────────────────────────────────────
  if (exif.dateTimeOriginal) {
    signals.push({ type: 'CAPTURE_DATE', value: exif.dateTimeOriginal, risk: 'LOW' });

    // Cross-reference against a claimed date if provided
    if (claimedDate) {
      const exifYear = exif.dateTimeOriginal.substring(0, 4);
      if (!claimedDate.includes(exifYear)) {
        warnings.push(
          `📅 Date mismatch: EXIF capture date is "${exif.dateTimeOriginal}", ` +
          `but the claim references "${claimedDate}". The image may have been repurposed from a different event.`
        );
        signals.push({
          type: 'DATE_MISMATCH',
          value: { exif: exif.dateTimeOriginal, claimed: claimedDate },
          risk: 'HIGH'
        });
        manipulationRisk = 'HIGH';
      }
    }
  } else {
    warnings.push('No capture timestamp in EXIF. Cannot independently verify when the image was originally taken.');
    signals.push({ type: 'NO_TIMESTAMP', value: null, risk: 'MEDIUM' });
  }

  // ── 4. GPS ─────────────────────────────────────────────────────────────────
  if (exif.gps) {
    signals.push({
      type: 'GPS_LOCATION',
      value: {
        latitude:  exif.gps.latitude,
        longitude: exif.gps.longitude,
        mapsUrl:   exif.gps.mapsUrl
      },
      risk: 'LOW'
    });
  } else {
    signals.push({ type: 'NO_GPS', value: null, risk: 'LOW' });
  }

  // ── 5. Orientation ─────────────────────────────────────────────────────────
  if (exif.orientation && exif.orientation !== 1) {
    const label = ORIENTATION_LABELS[exif.orientation] || `Orientation ${exif.orientation}`;
    const orientRisk = exif.orientation >= 3 ? 'MEDIUM' : 'LOW';
    signals.push({ type: 'ORIENTATION', value: label, risk: orientRisk });
    if (exif.orientation >= 3) {
      warnings.push(
        `Image orientation is "${label}". May have been rotated or mirrored from the original capture.`
      );
      if (manipulationRisk === 'LOW') manipulationRisk = 'MEDIUM';
    }
  }

  // ── 6. Image dimensions / resolution ──────────────────────────────────────
  if (exif.imageWidth && exif.imageHeight) {
    const mp = (exif.imageWidth * exif.imageHeight) / 1_000_000;
    const dimStr = `${exif.imageWidth}×${exif.imageHeight} (${mp.toFixed(1)} MP)`;
    signals.push({ type: 'DIMENSIONS', value: dimStr, risk: 'LOW' });

    if (mp < 0.1) {
      warnings.push(
        `Very low resolution image (${dimStr}). Likely a heavily compressed screenshot or cropped fragment.`
      );
      signals.push({ type: 'LOW_RESOLUTION', value: dimStr, risk: 'MEDIUM' });
      if (manipulationRisk === 'LOW') manipulationRisk = 'MEDIUM';
    }
  }

  // ── Final risk aggregation ─────────────────────────────────────────────────
  const highCount   = signals.filter(s => s.risk === 'HIGH').length;
  const mediumCount = signals.filter(s => s.risk === 'MEDIUM').length;

  if (highCount >= 2 || (highCount >= 1 && mediumCount >= 2)) {
    manipulationRisk = 'HIGH';
  } else if (highCount >= 1 || mediumCount >= 2) {
    if (manipulationRisk === 'LOW') manipulationRisk = 'MEDIUM';
  }

  // ── 7. Structured Metadata Fields (1-to-1 match with fact-checking signals) ─
  const isEditingSw = Boolean(exif.software && EDITING_SOFTWARE_KEYWORDS.some(k => exif.software.toLowerCase().includes(k)));
  const isCropDim = Boolean(exif.imageWidth && exif.imageHeight && ((exif.imageWidth * exif.imageHeight) < 100000));
  const isRotated = Boolean(exif.orientation && exif.orientation >= 3);

  const metadataFields = {
    dateTimeOriginal: {
      field: 'DateTimeOriginal',
      signal: 'Was the image captured on the claimed date?',
      value: exif.dateTimeOriginal || null,
      status: exif.dateTimeOriginal ? 'AVAILABLE' : 'MISSING',
      risk: exif.dateTimeOriginal ? 'LOW' : 'MEDIUM',
      finding: exif.dateTimeOriginal ? `Captured on ${exif.dateTimeOriginal}` : 'No timestamp tag (likely re-shared or screenshot)'
    },
    makeModel: {
      field: 'Make / Model',
      signal: 'Real camera vs screenshot tool',
      value: (exif.make && exif.model) ? `${exif.make} ${exif.model}` : (exif.make || exif.model || null),
      status: (exif.make || exif.model) ? 'CAMERA_DETECTED' : 'NO_CAMERA_TAG',
      risk: (exif.make || exif.model) ? 'LOW' : 'MEDIUM',
      finding: (exif.make || exif.model) ? `Captured on ${exif.make || ''} ${exif.model || ''}`.trim() : 'No camera hardware tag (screenshot tool or stripped metadata)'
    },
    software: {
      field: 'Software',
      signal: 'Photoshop / editing software → manipulation risk flag',
      value: exif.software || null,
      status: exif.software ? (isEditingSw ? 'EDITING_SOFTWARE_DETECTED' : 'SOFTWARE_TAGGED') : 'CLEAN',
      risk: isEditingSw ? 'HIGH' : 'LOW',
      finding: exif.software ? (isEditingSw ? `⚠️ Edited with ${exif.software}` : `Processed with ${exif.software}`) : 'No editing software signature'
    },
    gps: {
      field: 'GPS (Lat/Lon)',
      signal: 'Does location match claimed origin?',
      value: exif.gps || null,
      status: exif.gps ? 'GEO_TAGGED' : 'NO_GPS',
      risk: 'LOW',
      finding: exif.gps ? `Coordinates: ${exif.gps.latitude}, ${exif.gps.longitude}` : 'No GPS geolocation coordinates'
    },
    imageDimensions: {
      field: 'ImageWidth/Height',
      signal: 'Unusually small → screenshot crop',
      value: (exif.imageWidth && exif.imageHeight) ? `${exif.imageWidth}×${exif.imageHeight}` : null,
      status: (exif.imageWidth && exif.imageHeight) ? (isCropDim ? 'LOW_RESOLUTION_CROP' : 'STANDARD_RESOLUTION') : 'UNKNOWN',
      risk: isCropDim ? 'MEDIUM' : 'LOW',
      finding: (exif.imageWidth && exif.imageHeight) ? `${exif.imageWidth}×${exif.imageHeight} px` : 'Dimensions not embedded in EXIF'
    },
    orientation: {
      field: 'Orientation',
      signal: 'Flipped/rotated → re-shared image',
      value: exif.orientation ? (ORIENTATION_LABELS[exif.orientation] || `Orientation ${exif.orientation}`) : null,
      status: isRotated ? 'ROTATED_OR_FLIPPED' : 'NORMAL',
      risk: isRotated ? 'MEDIUM' : 'LOW',
      finding: exif.orientation ? (ORIENTATION_LABELS[exif.orientation] || `Orientation ${exif.orientation}`) : 'Standard orientation'
    }
  };

  // ── Human-readable summary ─────────────────────────────────────────────────
  const summaryParts = [];
  if (exif.make && exif.model)    summaryParts.push(`Captured on ${exif.make} ${exif.model}`);
  if (exif.dateTimeOriginal)       summaryParts.push(`taken ${exif.dateTimeOriginal}`);
  if (exif.software)               summaryParts.push(`processed with ${exif.software}`);
  if (exif.gps)                    summaryParts.push(`GPS ${exif.gps.latitude}, ${exif.gps.longitude}`);
  if (exif.imageWidth && exif.imageHeight) {
    summaryParts.push(`${exif.imageWidth}×${exif.imageHeight} px`);
  }

  return {
    hasExif: true,
    manipulationRisk,
    signals,
    warnings,
    metadataFields,
    summary: summaryParts.length > 0
      ? summaryParts.join('; ')
      : 'EXIF present but limited fields available.'
  };
}
