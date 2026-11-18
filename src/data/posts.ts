interface BlogPost {
  title: string
  date: string
  preview: string
  href: string
  featured?: boolean
  projectId?: string
}
export const POSTS: BlogPost[] = [
  {
    title: 'What if learning felt like Duolingo, but for anything?',
    projectId: '01',
    date: 'Jun 01, 2026',
    preview: "I built Beacon — an AI-powered learning app that generates a personalized curriculum for any skill you want to learn.",
    href: 'https://medium.com/@diertapasific/what-if-duolingo-could-teach-you-anything-9409db920cac',
    featured: true,
  },
  {
    title: 'SumTube: YouTube Videos into Instant Summaries',
    projectId: '02',
    date: 'Sep 09, 2025',
    preview: "YouTube has become the largest library of knowledge on the internet. From hour-long podcasts to educational lectures — here's how I built a tool to summarize it all instantly.",
    href: 'https://medium.com/@diertapasific/sumtube-turning-youtube-videos-into-instant-summaries-61b5e675595d',
  },
  {
    title: 'Cardify: LLM-Powered Flashcard Generator',
    projectId: '03',
    date: 'Jul 02, 2025',
    preview: "Have you ever felt overwhelmed by a dense PDF you need to study? Here's how I turned the Groq LLM API into an automatic flashcard factory.",
    href: 'https://medium.com/@diertapasific/cardify-llm-powered-flashcard-generator-f0385585c924',
  },
  {
    title: 'Rupcara: AI That Reads Your Money',
    projectId: '04',
    date: 'May 27, 2025',
    preview: "Imagine visually impaired individuals instantly recognizing the value of their money just by showing it to a camera. Here's how I built it with ResNet-18.",
    href: 'https://medium.com/@diertapasific/rupcara-empowering-the-visually-impaired-with-ai-money-recognition-adabc083be6d',
  },
  {
    title: 'ChatDP: AI-Powered Portfolio Chatbot',
    date: 'Apr 04, 2025',
    preview: "A portfolio website tells who you are — but I wanted mine to talk back. Here's the story behind building a chatbot that runs entirely in the browser.",
    href: 'https://medium.com/@diertapasific/chatdp-ai-powered-portfolio-chatbot-a9afd35141a3',
  },
  {
    title: 'Getting Started with Mobile App Development',
    date: 'Nov 07, 2023',
    preview: 'Mobile app development is the process of creating software for mobile devices. A practical introduction for anyone starting out on iOS or Android.',
    href: 'https://medium.com/@diertapasific/introduction-to-mobile-app-development-48098b2048c4',
  },
]
