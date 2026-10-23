// Vercel serverless function: GET /api/last-updated
// Returns when the site was last changed: the time of the latest commit on the branch this
// deployment was built from (main for sophieli.dev, dev for the preview), from the public
// GitHub repo, so no token needed.

const REPO = 'sophieli08/portfolio';
const BRANCH = process.env.VERCEL_GIT_COMMIT_REF || 'main';  // set by Vercel on every deployment

module.exports = async (req, res) => {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=1&sha=${encodeURIComponent(BRANCH)}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'sophieli.dev' },
    });
    if (!r.ok) throw new Error(`github commits failed: ${r.status}`);
    const [latest] = await r.json();
    if (!latest) return res.status(204).end();

    // cache on Vercel's CDN for 5 minutes, so GitHub's rate limit is never an issue
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({
      date: latest.commit.committer.date,
      url: `https://github.com/${REPO}/commits/${BRANCH}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'github unavailable' });
  }
};
