import { retrieverService } from '../src/retrieval/retriever.service.js';

async function inspectClaim(claimText) {
  console.log('\n' + '='.repeat(70));
  console.log(`🔍 INSPECTING EVIDENCE FOR CLAIM:`);
  console.log(`"${claimText}"`);
  console.log('='.repeat(70));

  const startTime = Date.now();
  const { evidence, retrieval_metadata } = await retrieverService.retrieveEvidence(claimText);
  const durationMs = Date.now() - startTime;

  console.log(`\n⏱️ Retrieval completed in ${durationMs}ms`);
  console.log('\n📊 PROVIDER STATUS & HEALTH:');
  for (const p of retrieval_metadata.providers_status) {
    const statusIcon = p.status === 'SUCCESS' ? '✅' : p.status === 'EMPTY' ? '⚪' : '⚠️';
    console.log(`  ${statusIcon} [${p.provider.toUpperCase()}]: Status = ${p.status} (Found: ${p.count}) ${p.reason ? `-> Reason: ${p.reason}` : ''}`);
  }

  console.log(`\n📋 CANDIDATES FOUND: ${retrieval_metadata.total_candidates} | VERIFIED CITATIONS: ${evidence.length}`);

  if (evidence.length === 0) {
    console.log('\n⚠️ NO VERIFIED EVIDENCE FOUND:');
    console.log('   Under TruthLens strict constraints, an unsupported claim cannot be confirmed.');
    console.log('   Expected verdict outcome: UNCONFIRMED');
    return;
  }

  console.log('\n📰 VERIFIED EVIDENCE ITEMS:');
  evidence.forEach((item, idx) => {
    console.log(`\n[#${idx + 1}] Source: ${item.source_name} (${item.trustTier || 'N/A'})`);
    console.log(`    URL:    ${item.url}`);
    console.log(`    Date:   ${item.published_date || 'N/A'}`);
    console.log(`    Stance: ${item.stance} (Relation: ${item.relation}) | Reliability: ${item.reliability_score}`);
    console.log(`    Official Domain: ${item.isOfficial ? 'YES' : 'NO'}`);
    console.log(`    Excerpt Quote: "${item.excerpt}"`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const inputClaim = args.join(' ').trim();

  if (inputClaim) {
    await inspectClaim(inputClaim);
  } else {
    // Run inspection on demo claims
    console.log('No specific claim argument provided. Running inspection on demo cases:\n');
    await inspectClaim('Drinking warm lemon water and baking soda alkalizes blood pH and cures cancer in 48 hours');
    await inspectClaim('PM Free Laptop Distribution Scheme 2021 registration for 10th and 12th pass students');
    await inspectClaim('SBI YONO account blocked due to expired KYC update at sbi-kyc-quickupdate.net');
    await inspectClaim('Eating blue quartz pebbles gives humans telepathy and time travel by next Tuesday');
  }
}

main().catch(err => {
  console.error('Fatal inspection error:', err);
  process.exit(1);
});
