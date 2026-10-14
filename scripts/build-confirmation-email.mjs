/*
 * Builds email/confirmation.html, the email Brevo sends when someone subscribes
 * through the site's form (a Brevo template, created from this file). It matches
 * the newsletter: rooms' photo and eyebrow, a title, a few lines of copy and the
 * same social links, which it takes from feed.xml (so run npm run build:feed
 * first).
 *
 *   npm run build:confirmation-email
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const INK = '#0E100D';
const MUTED = '#6b6c69';

const feed = readFileSync(join(ROOT, 'feed.xml'), 'utf8');
const socials = feed.match(/<rooms:socials><!\[CDATA\[([\s\S]*?)\]\]><\/rooms:socials>/)[1];

const p = (text) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.65;color:#2b2c2a;">${text}</p>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>you're subscribed to rooms</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr>
          <td style="padding:14px 14px 32px 14px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 5px;">
              <tr>
                <td width="22" valign="middle" style="width:22px;line-height:0;font-size:0;"><a href="https://thisisrooms.com/"><img src="https://thisisrooms.com/images/email/avatar-circle.png" width="22" height="22" alt="rooms" style="display:block;width:22px;height:22px;border:0;border-radius:50%;" /></a></td>
                <td valign="middle" style="padding-left:7px;font-family:${FONT};font-size:13px;line-height:1.4;color:${MUTED};">an update from <a href="https://thisisrooms.com/" style="color:${MUTED};text-decoration:underline;">rooms</a></td>
              </tr>
            </table>
            <h1 style="margin:0 0 24px;font-family:${FONT};font-size:28px;line-height:1.2;font-weight:bold;color:${INK};">you're subscribed</h1>
            ${p("Thanks for signing up! I'll email you when I release new music, along with the occasional update on my process and things I'm working on.")}
            ${p(`In the meantime, you can listen to my releases on <a href="https://thisisrooms.com/" style="color:${INK};text-decoration:underline;">thisisrooms.com</a>.`)}
            <div style="margin:24px 0 0;height:0;line-height:0;font-size:0;border-top:1px solid #e3e3e0;">&nbsp;</div>
            <p style="margin:0;padding-top:20px;font-family:${FONT};font-size:14px;line-height:1.4;"><a href="https://thisisrooms.com/" style="color:${MUTED};text-decoration:none;">visit thisisrooms.com &rarr;</a></p>
            <div style="margin:14px 0 0;">
              ${socials}
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;

writeFileSync(join(ROOT, 'email/confirmation.html'), html);
console.log('email/confirmation.html written');
