interface Props {
  title: string;
  description?: string;
}

export function SbbolPageHeader({ title, description }: Props) {
  return (
    <header className="mb-6">
      <h1 className="sbbol-page-title">{title}</h1>
      {description ? <p className="sbbol-page-lead mt-2">{description}</p> : null}
    </header>
  );
}
