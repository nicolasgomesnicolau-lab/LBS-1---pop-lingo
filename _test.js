function extractBase64Scripts(html) {
  var result = [];
  var idx = 0;
  while (true) {
    var scriptStart = html.indexOf('<script', idx);
    if (scriptStart === -1) break;
    var tagEnd = html.indexOf('>', scriptStart);
    if (tagEnd === -1) break;
    var contentStart = tagEnd + 1;
    var scriptEnd = html.indexOf('</script>', contentStart);
    if (scriptEnd === -1) break;
    var content = html.slice(contentStart, scriptEnd);
    if (/^[A-Za-z0-9+/=]+$/.test(content) && content.length >= 1000) {
      result.push(content);
    }
    idx = scriptEnd + 9;
  }
  return result;
}

async function main() {
  var htmlResp = await fetch('https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  var html = await htmlResp.text();
  
  var base64Scripts = extractBase64Scripts(html);
  console.log('Base64 script count:', base64Scripts.length);
  for (var si = 0; si < base64Scripts.length; si++) {
    var raw = base64Scripts[si];
    console.log('Script ' + si + ': raw length=' + raw.length);
    try {
      var decoded = Buffer.from(raw, 'base64').toString('utf8');
      console.log('  Decoded len:', decoded.length);
      console.log('  Has spotify:track:', decoded.includes('spotify:track:'));
      if (decoded.includes('spotify:track:')) {
        console.log('  SUCCESS!');
        var blocks = decoded.split('"__typename":"TrackResponseWrapper"');
        console.log('  Blocks:', blocks.length);
        for (var b = 1; b < blocks.length; b++) {
          var block = blocks[b];
          var nameMatch = block.match(/"name":"([^"]+)"/);
          if (!nameMatch) continue;
          var artistName = '';
          var artistMatch = block.match(/"artists":\{[^}]*?"items":\[[^\]]*?"name":"([^"]+)"/);
          if (artistMatch) {
            artistName = artistMatch[1];
          } else {
            var allNames = block.match(/"name":"([^"]+)"/g);
            if (allNames && allNames.length >= 2) {
              var am = allNames[1].match(/"name":"([^"]+)"/);
              if (am) artistName = am[1];
            }
          }
          if (b <= 5) console.log('  Track ' + b + ':', nameMatch[1], '-', artistName);
        }
      }
    } catch(e) { console.log('  Error:', e.message); }
  }
}

main().catch(console.error);
