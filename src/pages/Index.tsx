import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroBanner from "@/components/HeroBanner";
import CategoryGrid from "@/components/CategoryGrid";
import FeaturedProducts from "@/components/FeaturedProducts";
import SponsoredProducts from "@/components/SponsoredProducts";
import CampaignBanner from "@/components/CampaignBanner";

const Index = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main>
      <HeroBanner />
      <CampaignBanner />
      <SponsoredProducts />
      <CategoryGrid />
      <FeaturedProducts />
    </main>
    <Footer />
  </div>
);

export default Index;
