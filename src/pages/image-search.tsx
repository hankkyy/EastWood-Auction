import { Wrapper } from "@/layout";
import dynamic from "next/dynamic";
import { SEO } from "@/components/SEO";

const ImageSearchExperience = dynamic(
  () => import("@/components/ImageSearch/ImageSearchExperience"),
  {
    ssr: false,
  }
);

export default function SearchPage() {
  return (
    <>
      <SEO
        title="Image Search"
        description="Search for antiques by text or upload an image to find similar items. Upload a reference photo to find the closest matching antique product in our catalog."
      />
      <Wrapper>
        <ImageSearchExperience />
      </Wrapper>
    </>
  );
}
