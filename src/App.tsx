import DeskExperience from './desk/DeskExperience'

// Retained for the original pages while the desk prototype is evaluated.
export type Page = 'home' | 'chat' | 'projects' | 'experiences' | 'blog' | 'about'

export default function App() {
  return <DeskExperience />
}
