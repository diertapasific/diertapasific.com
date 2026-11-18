// Start fetching the reader on navigation, before the camera reaches the paper.
// Dynamic imports share the browser's module cache with React.lazy.
export const loadPaperArticle = () => import('./PaperArticleBody')
