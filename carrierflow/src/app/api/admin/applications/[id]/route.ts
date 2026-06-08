import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError } from "../../_utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("applications:read");
    const { id } = await params;

    const application = await db.onboardingApplication.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            companyName: true,
            createdAt: true,
          },
        },
        carrierType: {
          include: {
            partnerType: { select: { id: true, name: true, slug: true } },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                key: true,
                label: true,
                type: true,
              },
            },
          },
          orderBy: { question: { key: "asc" } },
        },
        documents: {
          include: {
            documentType: true,
            review: true,
          },
          orderBy: { uploadedAt: "desc" },
        },
        govVerifications: { orderBy: { verifiedAt: "desc" } },
        identityVerification: true,
        riskAssessments: { orderBy: { assessedAt: "desc" } },
        approvalLogs: {
          include: {
            actor: { select: { id: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const latestRisk = application.riskAssessments[0] ?? null;

    return NextResponse.json({
      application: {
        id: application.id,
        status: application.status,
        carrierTypeId: application.carrierTypeId,
        detectedType: application.detectedType,
        riskScore: application.riskScore,
        riskLevel: application.riskLevel,
        recommendation: application.recommendation,
        ruleVersionSnapshot: application.ruleVersionSnapshot,
        submittedAt: application.submittedAt,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
      user: application.user,
      carrierType: application.carrierType,
      answers: application.answers.map((a) => ({
        id: a.id,
        questionId: a.questionId,
        question: a.question,
        value: a.value,
        source: a.source,
      })),
      documents: application.documents.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        uploadedAt: d.uploadedAt,
        documentType: d.documentType,
        review: d.review,
      })),
      govVerifications: application.govVerifications,
      identityVerification: application.identityVerification,
      riskAssessments: application.riskAssessments,
      latestRiskAssessment: latestRisk,
      approvalLogs: application.approvalLogs,
      progress: {
        questionsAnswered: application.answers.length,
        questionsRequired: 0,
        documentsUploaded: application.documents.length,
        documentsRequired: 0,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
