// Visual signposts use the site's existing, credited manuscript pages, maps and engravings.
// These are editorial illustrations of study activities, not evidence for a chosen passage.
export const STUDY_VISUALS = {
  read: {image:'sinaiticus',verb:'Hear the passage',short:'Two translations, side by side',mark:'01'},
  observe: {image:'era-gospels',verb:'Look a little closer',short:'Patterns, people and repeated words',mark:'02'},
  words: {image:'aleppo',verb:'Beneath the translation',short:'Hebrew & Greek, with a lexicon',mark:'03'},
  context: {image:'map-paul',verb:'Enter its world',short:'People, places and historical setting',mark:'04'},
  commentaries: {image:'vaticanus',verb:'Join the conversation',short:'Read, compare and collect commentary',mark:'05'},
  connections: {image:'map-holyland',verb:'Follow the echoes',short:'Related Scripture, opened alongside',mark:'06'},
  outline: {image:'era-revelation',verb:'Find the thread',short:'Arrange your idea, points and sources',mark:'07'},
  apply: {image:'era-patriarchs',verb:'From study to life',short:'Consider your hearers and a response',mark:'08'}
};
export function studyRoute(spec,step='read',sermonId='') {
  return sermonId?`/pastors/sermon/${encodeURIComponent(sermonId)}?tab=research&step=${encodeURIComponent(step)}`:`/pastors/study/${encodeURIComponent(spec)}?step=${encodeURIComponent(step)}`;
}
