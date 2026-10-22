// One-time helper: logs you in to Spotify and prints a refresh token for the website.
//
// Usage (from the portfolio folder):
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/get-spotify-token.mjs
//
// In your Spotify app's settings, the Redirect URI must be exactly:
//   http://127.0.0.1:8888/callback

import http from 'node:http';
import { exec } from 'node:child_process';
import crypto from 'node:crypto';

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first (see usage at top of file).');
  process.exit(1);
}

const REDIRECT = 'http://127.0.0.1:8888/callback';
const state = crypto.randomBytes(8).toString('hex');
const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
  client_id: id,
  response_type: 'code',
  redirect_uri: REDIRECT,
  scope: 'user-read-recently-played',
  state,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== '/callback') return res.end();
  if (url.searchParams.get('state') !== state || !url.searchParams.get('code')) {
    res.end('Login failed, check the terminal.');
    console.error('Login failed:', url.searchParams.get('error') || 'state mismatch');
    return server.close();
  }
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: url.searchParams.get('code'),
      redirect_uri: REDIRECT,
    }),
  });
  const data = await tokenRes.json();
  if (!data.refresh_token) {
    res.end('Could not get a token, check the terminal.');
    console.error(data);
    return server.close();
  }
  res.end('Done! You can close this tab and go back to the terminal.');
  console.log('\nYour SPOTIFY_REFRESH_TOKEN (keep it secret, never commit it):\n');
  console.log(data.refresh_token + '\n');
  server.close();
});

server.listen(8888, '127.0.0.1', () => {
  console.log('Opening Spotify login in your browser...');
  exec(`open "${authUrl}"`);
});
