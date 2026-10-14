import { ArrowUpRight } from 'lucide-react';
import { GITHUB_README_URL, GITHUB_REPO_URL } from '@/lib/github-links';
import { SITE_NAME } from '@/lib/product-links';

export function GitHubGettingStarted() {
  return (
    <section className="panel" aria-labelledby="github">
      <div className="panel__head">
        <h2 id="github" className="panel__title">
          Run the proxy yourself
        </h2>
      </div>
      <div className="panel__body">
        <p className="panel__text">
          {SITE_NAME} is open source. The repository has the proxy, the install guide, and the detection engine.
        </p>
        <div className="btn-row">
          <a href={GITHUB_README_URL} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            Installation guide
            <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
          </a>
          <a href={GITHUB_REPO_URL} className="btn" target="_blank" rel="noopener noreferrer">
            {SITE_NAME} on GitHub
            <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
