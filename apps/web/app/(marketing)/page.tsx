import {
  Hero,
  Stats,
  Features,
  Testimonials,
  Pricing,
  Footer,
} from "@/components/landing/landing-sections";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Stats />
      <Features />
      <Testimonials />
      <Pricing />
      <Footer />
    </main>
  );
}
