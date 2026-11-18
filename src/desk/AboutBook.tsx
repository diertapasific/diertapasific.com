'use client'

import { AboutContent, aboutPageLabel, aboutPages } from './Content'
import { BookInscription } from './ObjectSurface'
import { TurningBook } from './TurningBook'
import type { AboutSection } from './model'

const content = (section: AboutSection) => <AboutContent section={section} />
const inscription = (section: AboutSection, preview: boolean) => <BookInscription destination="about" section={section} preview={preview} />

export function AboutBook({ section, onSection, reducedMotion }: { section: AboutSection; onSection: (section: AboutSection) => void; reducedMotion: boolean }) {
  return <TurningBook destination="about" section={section} onSection={onSection} reducedMotion={reducedMotion} pages={aboutPages} pageLabel={aboutPageLabel} header="ABOUT ME / FIELD NOTES" renderContent={content} renderInscription={inscription} />
}
