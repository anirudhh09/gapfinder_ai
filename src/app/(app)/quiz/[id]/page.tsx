import { notFound } from "next/navigation";
import { createClient } from "@/lib/db/server";
import QuizRunner from "@/components/QuizRunner";
import { PageTitle } from "@/components/ui";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("questions")
    .select("id, question, options, quiz_id, topics(name)")
    .eq("quiz_id", id);

  if (error) {
    throw new Error(
      `Failed to load quiz questions: ${error.message}`
    );
  }

  if (!data?.length) {
    notFound();
  }

  const questions = data.map((q: any) => ({
    id: q.id,
    question: q.question,
    options: q.options as string[],
    topic:
      (Array.isArray(q.topics)
        ? q.topics[0]?.name
        : q.topics?.name) ?? "Topic",
  }));

  return (
    <>
      <PageTitle
        title="Diagnostic quiz"
        subtitle={`${questions.length} questions from your material`}
      />

      <QuizRunner
        quizId={id}
        questions={questions}
      />
    </>
  );
}