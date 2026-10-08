/**
 * Public product naming — mastyf.ai security platform.
 */

export const SITE_NAME = 'mastyf.ai';
export const CLOUD_NAME = 'mastyf.ai Cloud';

/** Canonical production URL (www). Set NEXT_PUBLIC_APP_URL in Vercel to match. */
export const PRODUCTION_SITE_URL = 'https://www.mastyf.ai';
export const PRODUCTION_SITE_HOST = 'www.mastyf.ai';
export const PRODUCTION_APEX_HOST = 'mastyf.ai';

/** Kept for backward compatibility with API/library code — not shown in UI */
export const NPM_PRODUCT_NAME = 'mastyf.ai engine';
export const NPM_PACKAGE_NAME = 'mastyf.ai';
export const NPM_PACKAGE_URL = 'https://github.com/mastyf-ai/mastyf.ai';
export const CLI_NAME = 'mastyf-ai';
export const NPM_INSTALL_CMD = `npm install -g @mcp-guardian/server`;
export const CLI_ONBOARD_CMD = `mastyf-ai onboard --apply`;
export const CLI_START_CMD = `mastyf-ai start`;

/** Research & distribution */
export const HF_MODEL_URL = 'https://huggingface.co/Rudraneel93/mastyf-guard-1.5b';
export const HF_MODEL_ID = 'Rudraneel93/mastyf-guard-1.5b';
export const ZENODO_URL = 'https://zenodo.org/records/22501491';
export const ZENODO_DOI = '10.5281/zenodo.22501491';
export const ZENODO_CONCEPT_DOI = '10.5281/zenodo.22179415';
export const PAPER_TITLE =
  'Capability-Mediated Perimeters for Secure AI Agent Tool Execution';
export const PAPER_SUBTITLE =
  'Conditional Non-Escalation Invariants and Empirical Evaluation Against Indirect Prompt Injection';
/** Zenodo record version the site cites (resource type: preprint). */
export const PAPER_VERSION = '5.3';
export const PAPER_PDF_URL = 'https://zenodo.org/api/records/22501491/files/mastyf-guard.pdf/content';
/** Same-origin copy of the v5.3 PDF (text-identical to the Zenodo file); the research page renders it. */
export const PAPER_LOCAL_PDF_PATH = '/paper/mastyf-guard.pdf';
export const PAPER_BIBTEX = `@misc{das2026capability,
  title={${PAPER_TITLE}: ${PAPER_SUBTITLE}},
  author={Das, Rudraneel},
  publisher={Zenodo},
  note={Preprint, version ${PAPER_VERSION}},
  year={2026},
  doi={${ZENODO_DOI}},
  url={https://doi.org/${ZENODO_DOI}}
}`;
/** Working Lemon storefront (bare /checkout and old buy UUIDs 404). */
export const LEMON_STORE_URL = 'https://mastyfai.lemonsqueezy.com/';
export const HF_CHECKOUT_URL = LEMON_STORE_URL;
export const CONTACT_EMAIL = 'mastyf.support@gmail.com';
export const SHIELD_DOWNLOAD_PATH = '/download';
