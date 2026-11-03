#!/usr/bin/env bash
# Renders the A16 change-request bundles with tools/bundle2pdf_v2.cjs (same page order and titles as the frozen
# v1 bundles) and records their hashes in cr/PDF.SHA256.   usage: cr/render_bundles.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PI=(02-processes/process-interest-calculation.md 10-acceptance-criteria/acceptance-criteria-interest-calculation.md 01-data-model/project-data-model.md 04-integrations/workflow-account-data-access.md 04-integrations/workflow-reference-data-access.md 04-integrations/workflow-transaction-data-access.md 02-processes/process-end-of-day-batch-chain.md CONTRACT.md)
PP=(02-processes/process-daily-transaction-posting.md 10-acceptance-criteria/acceptance-criteria-daily-transaction-posting.md 01-data-model/project-data-model.md 04-integrations/workflow-account-data-access.md 04-integrations/workflow-batch-file-transfer.md 04-integrations/workflow-reference-data-access.md 04-integrations/workflow-transaction-data-access.md 02-processes/process-end-of-day-batch-chain.md CONTRACT.md)
R=tools/bundle2pdf_v2.cjs; O=${OUT:-builds/inputs}
if [ "${1:-}" != a21 ]; then
node $R builds/inputs/${SRC1:-cr1-intcalc-sonnet} $O/${SRC1:-cr1-intcalc-sonnet}.pdf "CardDemo interest calculation: wiki pages and I/O contract" "${PI[@]}"
node $R builds/inputs/${SRC2:-cr2-posttran-sonnet} $O/${SRC2:-cr2-posttran-sonnet}.pdf "CardDemo daily transaction posting: wiki pages and I/O contract" "${PP[@]}"
[ -n "${OUT:-}" ] || (cd builds/inputs && shasum -a 256 cr1-intcalc-sonnet.pdf cr2-posttran-sonnet.pdf > ../../cr/PDF.SHA256)
fi

# A21 draft (CR3-CR8): `cr/render_bundles.sh a21` renders the six edited bundles under neutral names (no change marker
# in any file or folder name), writes each bundle's per-page SHA256SUMS, and adds their PDF hashes to cr/PDF.SHA256
# (the CR1/CR2 lines are kept as they are). Without the argument the script does what it did for A16, unchanged.
if [ "${1:-}" = a21 ]; then
  PS=(02-processes/process-statement-generation.md 10-acceptance-criteria/acceptance-criteria-statement-generation.md 01-data-model/project-data-model.md 04-integrations/workflow-account-data-access.md 04-integrations/workflow-batch-file-transfer.md 04-integrations/workflow-transaction-data-access.md 07-plugins/plugin-statement-document.md 02-processes/process-end-of-day-batch-chain.md CONTRACT.md)
  PT=(02-processes/process-transaction-report.md 10-acceptance-criteria/acceptance-criteria-transaction-report.md 01-data-model/project-data-model.md 04-integrations/workflow-reference-data-access.md 04-integrations/workflow-transaction-data-access.md 07-plugins/plugin-transaction-report-document.md 02-processes/process-end-of-day-batch-chain.md 02-processes/process-report-request.md CONTRACT.md)
  TI="CardDemo interest calculation: wiki pages and I/O contract"; TP="CardDemo daily transaction posting: wiki pages and I/O contract"
  TS="CardDemo statement generation: wiki pages and I/O contract"; TT="CardDemo daily transaction report: wiki pages and I/O contract"
  A21=(intcalc-sonnet-ni2 posttran-sonnet-va7 posttran-sonnet-dr8 creastmt-sonnet-bd5 tranrept-sonnet-ix3 creastmt-sonnet-yx3)
  node $R builds/inputs/intcalc-sonnet-ni2  builds/inputs/intcalc-sonnet-ni2.pdf  "$TI" "${PI[@]}"
  node $R builds/inputs/posttran-sonnet-va7 builds/inputs/posttran-sonnet-va7.pdf "$TP" "${PP[@]}"
  node $R builds/inputs/posttran-sonnet-dr8 builds/inputs/posttran-sonnet-dr8.pdf "$TP" "${PP[@]}"
  node $R builds/inputs/creastmt-sonnet-bd5 builds/inputs/creastmt-sonnet-bd5.pdf "$TS" "${PS[@]}"
  node $R builds/inputs/tranrept-sonnet-ix3 builds/inputs/tranrept-sonnet-ix3.pdf "$TT" "${PT[@]}"
  node $R builds/inputs/creastmt-sonnet-yx3 builds/inputs/creastmt-sonnet-yx3.pdf "$TS" "${PS[@]}"
  for b in "${A21[@]}"; do (cd builds/inputs/$b && find . -type f ! -name SHA256SUMS | sort | xargs shasum -a 256 > SHA256SUMS); done
  { grep -v -e '-sonnet-...\.pdf$' cr/PDF.SHA256; (cd builds/inputs && shasum -a 256 "${A21[@]/%/.pdf}"); } > cr/PDF.SHA256.new
  mv cr/PDF.SHA256.new cr/PDF.SHA256
fi
