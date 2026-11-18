export const readingBooks = [
  {
    id: 'atomic-habits', title: 'Atomic Habits', lines: ['Atomic', 'Habits'], author: 'James Clear', topic: 'HABITS / EVERYDAY PRACTICE',
    notes: [
      "I realized that small things can have a big impact when I do them consistently. It doesn't have to be anything huge.",
      "Even making my bed in the morning can make a difference in how I start the day.",
    ],
  },
  {
    id: 'psychology-of-money', title: 'The Psychology of Money', lines: ['The', 'Psychology', 'of Money'], author: 'Morgan Housel', topic: 'MONEY / HUMAN BEHAVIOR',
    notes: [
      "Doing well with money isn't just about what I know. It's more about how I behave with it.",
      "Everyone sees money differently because we haven't all had the same struggles or grown up with the same family background. What seems crazy to me might feel completely normal to someone else.",
    ],
  },
  {
    id: 'let-them-theory', title: 'The Let Them Theory', lines: ['The Let', 'Them Theory'], author: 'Mel Robbins & Sawyer Robbins', topic: 'PERSPECTIVE / RELATIONSHIPS',
    notes: [
      "There's no point trying to control what other people think of me. I can let them think what they want and focus on what I can control: how I react and how I behave.",
      "I also need to stop worrying so much about being judged. Whatever I decide or do, people will have their own opinions.",
    ],
  },
] as const

export type ReadingBookId = typeof readingBooks[number]['id']
export const readingPages = readingBooks.map(book => book.id)
export const getReadingBook = (id: ReadingBookId) => readingBooks.find(book => book.id === id)!
