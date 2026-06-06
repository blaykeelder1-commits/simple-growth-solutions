import {
  Hero,
  HowItWorks,
  Portfolio,
  Testimonials,
  CTA,
  Header,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Portfolio />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
