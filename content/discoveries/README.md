# Discoveries

Each JSON file holds an array of discovery entries. The field list and the research rules are in
scripts/discoveries-brief.md. In short: only documented finds; at least two sources, one institutional or peer-reviewed,
each opened and checked; say what the find establishes and what it does not; mark disputes as "debated".

After editing, run `node scripts/build-discoveries.mjs` (it refuses to write if any entry breaks the rules), then `npm test`.
Photos: put the Commons file name in `image.commons`; `scripts/fetch-discovery-images.mjs` downloads and credits it.
