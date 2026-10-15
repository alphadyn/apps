const ARCHIVE_SEARCH = 'https://archive.org/advancedsearch.php';
const ARCHIVE_METADATA = 'https://archive.org/metadata/';
const ARCHIVE_DOWNLOAD = 'https://archive.org/download/';
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus', 'weba']);
const MIME_TYPES = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  weba: 'audio/webm'
};

function isCreativeCommonsLicense(value) {
  try {
    const license = new URL(value);
    return license.hostname === 'creativecommons.org'
      && (/^\/licenses\/[a-z-]+\/\d/.test(license.pathname)
        || /^\/publicdomain\/(?:mark|zero)\/\d/.test(license.pathname));
  } catch {
    return false;
  }
}

function fileExtension(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name).split(/[?#]/)[0]);
  return match ? match[1].toLowerCase() : '';
}

export function archiveLicenseName(value) {
  if (!isCreativeCommonsLicense(value)) return '';
  const path = new URL(value).pathname;
  const match = /^\/licenses\/([a-z-]+)\/(\d+(?:\.\d+)*)/.exec(path);
  if (match) return `CC ${match[1].toUpperCase()} ${match[2]}`;
  const publicDomain = /^\/publicdomain\/(mark|zero)\/(\d+(?:\.\d+)*)/.exec(path);
  return publicDomain ? `Public Domain ${publicDomain[1] === 'zero' ? 'CC0' : 'Mark'} ${publicDomain[2]}` : '';
}

export function buildArchiveSearchUrl(input) {
  const query = String(input || '').trim().replace(/\s+/g, ' ');
  if (query.length < 2 || query.length > 200) {
    throw new Error('Search terms must be between 2 and 200 characters.');
  }
  const escaped = query.replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, '\\$1');
  const url = new URL(ARCHIVE_SEARCH);
  url.searchParams.set(
    'q',
    `mediatype:audio AND licenseurl:*creativecommons.org* AND (title:(${escaped}) OR creator:(${escaped}))`
  );
  for (const field of ['identifier', 'title', 'creator', 'description', 'licenseurl']) {
    url.searchParams.append('fl[]', field);
  }
  url.searchParams.set('rows', '20');
  url.searchParams.set('page', '1');
  url.searchParams.set('output', 'json');
  return url.href;
}

export function parseArchiveSearch(payload) {
  const docs = payload?.response?.docs;
  if (!Array.isArray(docs)) throw new Error('Internet Archive returned an unexpected search response.');
  return docs.flatMap((item) => {
    if (typeof item?.identifier !== 'string'
      || !/^[a-z0-9._-]{1,128}$/i.test(item.identifier)
      || typeof item.title !== 'string'
      || !isCreativeCommonsLicense(item.licenseurl)) return [];
    const url = new URL(`https://archive.org/details/${encodeURIComponent(item.identifier)}`);
    const creator = typeof item.creator === 'string'
      ? item.creator
      : Array.isArray(item.creator) ? item.creator.filter((value) => typeof value === 'string').join(', ') : '';
    const description = [
      creator && `Creator: ${creator}`,
      `License: ${archiveLicenseName(item.licenseurl)}`
    ].filter(Boolean).join(' · ');
    return [{
      identifier: item.identifier,
      title: item.title.slice(0, 300),
      creator: creator.slice(0, 200),
      licenseUrl: item.licenseurl,
      licenseName: archiveLicenseName(item.licenseurl),
      pageUrl: url.href,
      description
    }];
  });
}

export function buildArchiveMetadataUrl(identifier) {
  if (typeof identifier !== 'string' || !/^[a-z0-9._-]{1,128}$/i.test(identifier)) {
    throw new Error('Invalid Internet Archive item.');
  }
  const url = new URL(`${encodeURIComponent(identifier)}?output=json`, ARCHIVE_METADATA);
  return url.href;
}

export function selectArchiveAudioFile(payload) {
  const metadata = payload?.metadata;
  if (!metadata
    || typeof metadata.identifier !== 'string'
    || !/^[a-z0-9._-]{1,128}$/i.test(metadata.identifier)
    || !isCreativeCommonsLicense(metadata.licenseurl)
    || !Array.isArray(payload.files)) {
    throw new Error('This item has no verified Creative Commons or public-domain license.');
  }
  const files = payload.files
    .filter((file) => file && typeof file.name === 'string' && !file.name.includes('/'))
    .map((file) => ({ file, extension: fileExtension(file.name) }))
    .filter(({ file, extension }) =>
      AUDIO_EXTENSIONS.has(extension)
      && file.source !== 'metadata'
      && file.private !== 'true'
      && file.private !== true
      && Number(file.size) > 0)
    .sort((a, b) => {
      const priority = (extension) => extension === 'mp3' ? 0 : extension === 'm4a' ? 1 : 2;
      return priority(a.extension) - priority(b.extension);
    });
  const selected = files[0];
  if (!selected) throw new Error('No downloadable audio file was found for this item.');

  const url = new URL(
    `${encodeURIComponent(metadata.identifier)}/${encodeURIComponent(selected.file.name)}`,
    ARCHIVE_DOWNLOAD
  );
  return {
    url: url.href,
    fileName: selected.file.name,
    type: MIME_TYPES[selected.extension]
  };
}
