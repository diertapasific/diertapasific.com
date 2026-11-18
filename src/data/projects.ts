interface ProjectLink {
  label: string
  href: string
  icon: 'github' | 'external'
}

interface Project {
  id: string
  name: string
  tagline: string
  description: string
  tags: string[]
  links: ProjectLink[]
}

export const PROJECTS: Project[] = [
  {
    id: '01',
    name: 'Beacon',
    tagline: 'AI-Generated Personalized Learning Paths',
    description: "I built Beacon to make learning a daily habit, whatever the subject. It creates a path around your level, goals, and available time, then teaches through short lessons and quizzes. Streaks, XP, and spaced reviews help you keep coming back. Gemini generates and caches each phase, with the next one prepared in the background.",
    tags: ['Next.js', 'PostgreSQL', 'Prisma', 'Gemini'],
    links: [
      { label: 'Repository', href: 'https://github.com/diertapasific/beacon', icon: 'github' },
      { label: 'Live Demo', href: 'https://beaconlearn.vercel.app/', icon: 'external' },
    ],
  },
  {
    id: '02',
    name: 'SumTube',
    tagline: 'YouTube Videos into Instant Summaries',
    description: "I built SumTube to get the useful parts of long YouTube videos into a shorter read. It pulls the transcript, summarizes it in chunks, then combines those results into a clearer overview. It supports English and Indonesian videos and keeps the full transcript available, with bullet-point takeaways and a PDF you can save.",
    tags: ['Python', 'Streamlit', 'HuggingFace', 'NLP'],
    links: [
      { label: 'Repository', href: 'https://github.com/diertapasific/sumtube', icon: 'github' },
      { label: 'Live Demo', href: 'https://sumtube.streamlit.app/', icon: 'external' },
    ],
  },
  {
    id: '03',
    name: 'Cardify',
    tagline: 'LLM-Powered Flashcard Generator from PDF',
    description: 'Cardify turns a PDF into short, printable study cards. I split the document into manageable chunks, use LLaMA 3 through Groq to pull out the key ideas, then turn those notes into one-sentence flashcards. The cards stay available as you use the app and can be exported as a PDF.',
    tags: ['Python', 'Streamlit', 'Groq API', 'LLM'],
    links: [
      { label: 'Repository', href: 'https://github.com/diertapasific/cardify', icon: 'github' },
      { label: 'Live Demo', href: 'https://cardifyai.streamlit.app/', icon: 'external' },
    ],
  },
  {
    id: '04',
    name: 'Rupcara',
    tagline: 'AI Money Recognition for the Visually Impaired',
    description: 'Rupcara helps people recognize Indonesian banknotes through spoken feedback. I fine-tuned ResNet-18 to identify Rupiah notes from different print years, then paired it with Indonesian text-to-speech in a Streamlit prototype. An Unknown category helps it reject unrelated images instead of forcing them into a denomination.',
    tags: ['PyTorch', 'ResNet-18', 'Computer Vision', 'TTS'],
    links: [
      { label: 'Repository', href: 'https://github.com/diertapasific/rupcara', icon: 'github' },
      { label: 'Live Demo', href: 'https://rupcara.streamlit.app/', icon: 'external' },
    ],
  },
  {
    id: '05',
    name: 'ChatDP',
    tagline: "AI Personal Assistant — this site's chatbot",
    description: 'Custom chatbot powered by a fine-tuned sentence transformer model converted to ONNX for client-side inference. Zero server costs, real-time semantic matching directly in the browser.',
    tags: ['ONNX', 'Transformers.js', 'TypeScript', 'Semantic Search'],
    links: [
      { label: 'Repository', href: 'https://github.com/diertapasific/diertapasific.github.io', icon: 'github' },
    ],
  },
  {
    id: '06',
    name: 'Frezz',
    tagline: 'AI Fruit Freshness Detector',
    description: 'CNN model achieving 98% accuracy classifying fresh and rotten apples, bananas, and oranges. Converted to TensorFlow.js and deployed as a Progressive Web Application.',
    tags: ['TensorFlow.js', 'CNN', 'PWA', 'Computer Vision'],
    links: [
      { label: 'Repository', href: 'https://github.com/shafamira/frezz', icon: 'github' },
      { label: 'Dataset', href: 'https://www.kaggle.com/datasets/sriramr/fruits-fresh-and-rotten-for-classification', icon: 'external' },
    ],
  },
  {
    id: '07',
    name: 'Telecom Churn Analysis',
    tagline: 'Customer Churn Prediction with Machine Learning',
    description: 'End-to-end ML pipeline for telecom churn prediction using Random Forest. Feature importance reveals Total Day Charge, Total Day Minutes, and Customer Service Calls as top predictors.',
    tags: ['Python', 'Scikit-learn', 'EDA', 'Random Forest'],
    links: [
      { label: 'Repository', href: 'https://github.com/diertapasific/telecom-churn', icon: 'github' },
      { label: 'Dataset', href: 'http://kaggle.com/datasets/mnassrib/telecom-churn-datasets', icon: 'external' },
    ],
  },
  {
    id: '08',
    name: 'VeganFuel',
    tagline: 'Vegan Food Ordering iOS App',
    description: 'VeganFuel is a Swift app for finding and ordering plant-based meals. It brings together menus, nutritional details, customizable orders, and nearby restaurant recommendations. The interface was designed in Figma, with the aim of making vegan food easier to explore.',
    tags: ['Swift', 'iOS', 'Figma'],
    links: [
      { label: 'Repository', href: 'https://github.com/diertapasific/VeganFuel', icon: 'github' },
      { label: 'UI Preview', href: 'https://www.figma.com/proto/oyGd1FC6OvZJboVkG6nnJi/Mock-Up-VeganFuel?node-id=117-35&starting-point-node-id=117%3A35', icon: 'external' },
    ],
  },
  {
    id: '09',
    name: 'Priocars',
    tagline: 'Car Rental Database System',
    description: 'Database systems class final project — structured schema design, optimized SQL queries for insertions, updates, and retrievals, and a clean interface for managing rental transactions.',
    tags: ['SQL', 'Database Design', 'Figma'],
    links: [
      { label: 'UI Preview', href: 'https://www.figma.com/proto/zB6oo2ksVjT02lNoeKLVxX/priocars?node-id=2-154&scaling=contain&content-scaling=fixed', icon: 'external' },
    ],
  },
]

