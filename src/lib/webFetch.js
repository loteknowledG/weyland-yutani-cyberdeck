export const fetchWeb = async (query, numResults = 5) => {
  try {
    const res = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=${numResults}`)}`,
      { timeout: 10000 }
    );
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const html = await res.text();
    const urls = [];
    const linkRegex = /href="(\/url\?q=https?:\/\/[^"&]+)"/g;
    let match;
    while ((match = linkRegex.exec(html)) !== null && urls.length < numResults) {
      const url = decodeURIComponent(match[1]);
      if (url.startsWith("http") && !url.includes("google.com")) {
        urls.push(url);
      }
    }
    return { success: true, urls, query };
  } catch (err) {
    return { success: false, error: String(err.message || err), query };
  }
};

export const fetchUrl = async (url) => {
  try {
    const res = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      { timeout: 15000 }
    );
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const text = await res.text();
    return {
      success: true,
      content: text.slice(0, 4000),
      url,
      truncated: text.length > 4000,
    };
  } catch (err) {
    return { success: false, error: String(err.message || err), url };
  }
};