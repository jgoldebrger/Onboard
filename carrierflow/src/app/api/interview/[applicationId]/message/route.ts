import { after, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { enrichInterviewInBackground } from "@/lib/interview/enrich";
import {
  processInterviewMessage,
  ValidationError,
} from "@/lib/interview/flow";
import { assertApplicationOwner } from "@/app/api/interview/_utils";

type Params = { params: Promise<{ applicationId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { applicationId } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await assertApplicationOwner(applicationId, user.id);
  if ("error" in access && access.error) {
    return access.error;
  }

  let body: { message?: string; questionKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const questionKey =
    typeof body.questionKey === "string" ? body.questionKey.trim() : undefined;

  try {
    const result = await processInterviewMessage(applicationId, message, {
      questionKey: questionKey || undefined,
    });

    after(async () => {
      await enrichInterviewInBackground(applicationId, message);
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        {
          error: err.message,
          message: err.message,
          savedAnswerKeys: [],
        },
        { status: 400 },
      );
    }
    console.error("interview message error", err);
    return NextResponse.json(
      { error: "Could not save your answer. Please try again." },
      { status: 500 },
    );
  }
}
