import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ProblemSection from '@/components/ProblemSection'
import ProfitCalculator from '@/components/ProfitCalculator'
import SolutionSection from '@/components/SolutionSection'
import Features from '@/components/Features'
import Pricing from '@/components/Pricing'
import SocialProof from '@/components/SocialProof'
import MiningNews from '@/components/MiningNews'
import FAQ from '@/components/FAQ'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <ProblemSection />
      <ProfitCalculator />
      <SolutionSection />
      <Features />
      <SocialProof />
      <Pricing />
      <MiningNews />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  )
}
