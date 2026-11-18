type Step = { title: string; description: string }
type Note = { title: string; body: string }
export type ProjectOverview = { intro: string; flow: Step[]; notes: Note[]; takeaway: string }

// Condensed from the existing Medium write-ups. VeganFuel uses the existing
// portfolio description; it has no Medium article or documented backend to infer.
export const projectOverviews: Record<string, ProjectOverview> = {
  '01': {
    intro: 'Beacon is my take on making learning feel like a daily habit. Instead of another fixed course, it builds a curriculum around the subject you want to learn, your starting level, your goals and the time you have.',
    flow: [
      { title: 'Set a direction', description: 'Choose a subject, your level and the time you can give it.' },
      { title: 'Follow a path', description: 'Work through short lessons and quizzes in a generated curriculum.' },
      { title: 'Keep returning', description: 'Streaks, XP and spaced reviews support the daily learning loop.' },
    ],
    notes: [
      { title: 'Generate in phases', body: 'Gemini generates and caches each phase of the curriculum. The next phase is prepared in the background, keeping generation out of the way while you work through the current one.' },
      { title: 'Build the habit around the content', body: 'The product combines lessons with quizzes, progress and review. Next.js handles the application, with Prisma and PostgreSQL behind it. The interface was built around a tactile, playful design system.' },
    ],
    takeaway: 'The bet behind Beacon is that the pull of a daily learning habit can work across subjects, not just languages. The core loop is live; that long-term engagement is still a hypothesis to test.',
  },
  '02': {
    intro: 'I built SumTube for the times when a useful YouTube video is much longer than the time I have. It turns a transcript into a shorter overview and key points, while keeping the full source available for anything that needs more context.',
    flow: [
      { title: 'Paste a video', description: 'Fetch the YouTube transcript and video information.' },
      { title: 'Summarize in chunks', description: 'Process manageable sections, then combine their summaries.' },
      { title: 'Read or keep it', description: 'Browse the takeaways, check the transcript or download a PDF.' },
    ],
    notes: [
      { title: 'Handle long transcripts', body: 'The transcript is split before summarization instead of sending an entire long video through the model at once. The chunk summaries are then combined into the final overview.' },
      { title: 'Keep the source within reach', body: 'The Streamlit interface separates the summary and full transcript into tabs. It supports English and Indonesian videos, with Hugging Face Transformers and PyTorch for summarization and ReportLab for the PDF output.' },
    ],
    takeaway: 'The summary is a quicker way into the material. Keeping the transcript alongside it lets readers go back to the detail when a short takeaway is not enough.',
  },
  '03': {
    intro: 'Cardify started with a familiar problem: turning a long PDF into study material takes time away from actually studying it. The app extracts the important ideas and turns them into short, printable flashcards.',
    flow: [
      { title: 'Upload a PDF', description: 'Extract its text and group pages into manageable chunks.' },
      { title: 'Find the key ideas', description: 'Summarize each chunk before generating the study cards.' },
      { title: 'Take the cards away', description: 'Read the cards in the app or export them as a formatted PDF.' },
    ],
    notes: [
      { title: 'Use two generation steps', body: 'LLaMA 3 through Groq first identifies the key points in each text chunk. A second prompt turns the combined notes into cards, giving the final generation a more focused set of material to work from.' },
      { title: 'Make the output predictable', body: 'The card prompt asks for one sentence per card, without question-and-answer formatting or introductory text. Streamlit presents the result, while ReportLab lays out the downloadable PDF and wraps the text inside each card.' },
    ],
    takeaway: 'Useful generated study material needs a clear format as well as a summary. Here, the extraction, prompts and PDF layout all work toward a small card that can be read on its own.',
  },
  '04': {
    intro: 'Rupcara gives Indonesian banknotes a spoken label. I built it to explore how image recognition and Indonesian text-to-speech could make identifying money more accessible, especially for people who rely on audio feedback.',
    flow: [
      { title: 'Provide an image', description: 'Start with a picture of an Indonesian Rupiah note.' },
      { title: 'Recognize the note', description: 'A fine-tuned ResNet-18 model predicts the denomination.' },
      { title: 'Hear the result', description: 'Indonesian speech announces the result or asks for a valid image.' },
    ],
    notes: [
      { title: 'Train for real variation', body: 'The model works with notes from different print years. The Streamlit prototype connects the PyTorch recognition model to text-to-speech so the result can be heard as well as read.' },
      { title: 'Teach it when to say unknown', body: 'The training data includes unrelated images in an Unknown category. A photo of a random object should not be forced into a banknote denomination; the app can show a warning and respond through speech instead.' },
    ],
    takeaway: 'Handling a wrong input is part of the product, especially when someone may depend on its spoken answer. The Unknown category is an important part of that design.',
  },
  '08': {
    intro: 'VeganFuel is a Swift iOS project for exploring and ordering plant-based meals. It brings menu choices, nutritional details and order customization into one experience, with nearby restaurant recommendations to help people find somewhere to start.',
    flow: [
      { title: 'Find a meal', description: 'Explore plant-based menus and nearby restaurant recommendations.' },
      { title: 'Check the details', description: 'Look at nutrition information and customize an order.' },
      { title: 'Make a choice', description: 'Move from browsing a menu to placing a meal order.' },
    ],
    notes: [
      { title: 'Make food easier to explore', body: 'The interface brings discovery and meal details together. Nutritional information and customization give people more context when deciding what they want to eat.' },
      { title: 'Design the mobile experience', body: 'The project combines a Swift app with interface design in Figma. The linked prototype shows the screens and ordering experience; the repository contains the app project.' },
    ],
    takeaway: 'The product focus is helping people explore plant-based food with enough information to choose a meal. The UI preview and repository are available here; there is no separate Medium write-up.',
  },
}
