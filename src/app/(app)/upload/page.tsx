import { createClient } from "@/lib/db/server";
import UploadForm from "@/components/UploadForm";
import DocList from "@/components/DocList";
import { Card, PageTitle } from "@/components/ui";

export default async function UploadPage() {
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("documents").select("id, title, type, created_at").order("created_at", { ascending: false });

  return (
    <>
      <PageTitle title="Your materials" subtitle="Upload a syllabus first, then notes and past papers. Everything the app asks or answers comes from these files." />
      <Card className="mb-6"><UploadForm /></Card>
      <Card>
        <h2 className="mb-2 font-semibold">Uploaded documents</h2>
        <DocList docs={docs ?? []} />
      </Card>
    </>
  );
}
