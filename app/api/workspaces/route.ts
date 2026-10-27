import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth/session';
import { createAppError, getHttpStatusForError } from '@/lib/errors';
import { generateSlug, onboardingWorkspaceSchema } from '@/lib/validators';
import { createWorkspaceForUser, getAuthorizedWorkspacesForUser } from '@/lib/db/repository';

export async function GET() {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json(createAppError('UNAUTHORIZED'), {
      status: getHttpStatusForError('UNAUTHORIZED'),
    });
  }

  const workspaces = getAuthorizedWorkspacesForUser(user.userId);
  return NextResponse.json({ workspaces });
}

export async function POST(request: Request) {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json(createAppError('UNAUTHORIZED'), {
      status: getHttpStatusForError('UNAUTHORIZED'),
    });
  }

  const contentType = request.headers.get('content-type') ?? '';
  let rawPayload: Record<string, unknown> = {};

  if (contentType.includes('application/json')) {
    rawPayload = (await request.json()) as Record<string, unknown>;
  } else {
    const formData = await request.formData();
    const nameStr = String(formData.get('name') ?? '');
    const customSlug = String(formData.get('slug') ?? '').trim();
    rawPayload = {
      type: String(formData.get('type') ?? 'wo'),
      name: nameStr,
      slug: customSlug || generateSlug(nameStr),
      cityOptional: String(formData.get('cityOptional') ?? ''),
      idempotencyKey:
        String(formData.get('idempotencyKey') ?? '') || crypto.randomUUID(),
    };
  }

  const parsed = onboardingWorkspaceSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? 'Data workspace tidak valid.';
    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(
        new URL(`/onboarding?error=${encodeURIComponent(firstIssue)}`, request.url),
        303
      );
    }
    return NextResponse.json(createAppError('VALIDATION_ERROR', firstIssue), {
      status: getHttpStatusForError('VALIDATION_ERROR'),
    });
  }

  const { workspace, createdNew } = createWorkspaceForUser({
    userId: user.userId,
    type: parsed.data.type,
    name: parsed.data.name,
    slug: parsed.data.slug,
    idempotencyKey: parsed.data.idempotencyKey,
  });

  if (!contentType.includes('application/json')) {
    return NextResponse.redirect(new URL(`/app/w/${workspace.id}`, request.url), 303);
  }

  return NextResponse.json(
    {
      status: createdNew ? 'created' : 'idempotent_existing',
      workspace,
    },
    { status: createdNew ? 201 : 200 }
  );
}
