import { Wrapper } from "@/layout";
import dynamic from "next/dynamic";
import Head from "next/head";

const ImageSearchExperience = dynamic(
  () => import("@/components/ImageSearch/ImageSearchExperience"),
  {
    ssr: false,
  }
);

export default function SearchPage() {
  return (
    <>
      <Head>
        <title>Eastwood Auction - Search</title>
      </Head>
      <Wrapper>
        <ImageSearchExperience />
      </Wrapper>
    </>
  );
}
