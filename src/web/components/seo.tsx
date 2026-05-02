interface SEOProps {
  title: string;
  description: string;
}

export function SEO({ title, description }: SEOProps) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
    </>
  );
}
