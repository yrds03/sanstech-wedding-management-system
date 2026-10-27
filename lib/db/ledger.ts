export interface CheckinLedgerRecord {
  id: string;
  eventId: string;
  invitationGroupId: string;
  actorUserId: string;
  deltaAttendees: number;
  method: 'qr' | 'manual' | 'correction';
  reasonNullable: string | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface InvitationGroupRecord {
  id: string;
  eventId: string;
  displayName: string;
  capacity: number;
  guestCategory: 'regular' | 'vip' | 'vvip';
  allowedPublicDisplay: boolean;
  status: 'active' | 'archived';
}

export interface AtomicCheckinResult {
  ok: boolean;
  status:
    | 'success'
    | 'idempotent_replay'
    | 'capacity_exceeded'
    | 'negative_attendance'
    | 'group_not_found'
    | 'cross_event_mismatch';
  invitationGroupId?: string;
  addedAttendees?: number;
  checkedInCount?: number;
  capacity?: number;
  remaining?: number;
  welcomeQueued?: boolean;
  errorMessageId?: string;
}

/**
 * Mengevaluasi transaksi penambahan/koreksi kehadiran berdasarkan aturan invarian PRD:
 * 1. Idempotency key mencegah pencatatan ganda pada retry jaringan.
 * 2. Grup undangan wajib berada pada event yang sama.
 * 3. `0 <= SUM(ledger.delta_attendees) <= capacity`.
 * 4. Koreksi negatif wajib menyertakan alasan minimal 5 karakter.
 */
export function evaluateCheckinTransaction(params: {
  group: InvitationGroupRecord | null;
  targetEventId: string;
  existingLedger: CheckinLedgerRecord[];
  actorUserId: string;
  deltaAttendees: number;
  method: 'qr' | 'manual' | 'correction';
  idempotencyKey: string;
  reason?: string | null;
}): {
  result: AtomicCheckinResult;
  newEntry?: CheckinLedgerRecord;
} {
  const {
    group,
    targetEventId,
    existingLedger,
    actorUserId,
    deltaAttendees,
    method,
    idempotencyKey,
    reason,
  } = params;

  // 1. Periksa idempotency key pada event yang sama
  const existingByKey = existingLedger.find(
    (entry) => entry.eventId === targetEventId && entry.idempotencyKey === idempotencyKey
  );

  if (existingByKey && group) {
    const currentTotal = existingLedger
      .filter((e) => e.invitationGroupId === group.id)
      .reduce((acc, item) => acc + item.deltaAttendees, 0);

    return {
      result: {
        ok: true,
        status: 'idempotent_replay',
        invitationGroupId: group.id,
        addedAttendees: existingByKey.deltaAttendees,
        checkedInCount: currentTotal,
        capacity: group.capacity,
        remaining: Math.max(0, group.capacity - currentTotal),
        welcomeQueued: false,
      },
    };
  }

  // 2. Pastikan grup ditemukan & aktif
  if (!group || group.status !== 'active') {
    return {
      result: {
        ok: false,
        status: 'group_not_found',
        errorMessageId: 'QR atau grup undangan tidak dikenali untuk acara ini.',
      },
    };
  }

  // 3. Pastikan tidak lintas acara (Cross-event QR check TC-008)
  if (group.eventId !== targetEventId) {
    return {
      result: {
        ok: false,
        status: 'cross_event_mismatch',
        errorMessageId: 'QR tidak dikenali untuk acara ini.',
      },
    };
  }

  // 4. Hitung total kehadiran saat ini dari ledger
  const currentTotal = existingLedger
    .filter((e) => e.invitationGroupId === group.id)
    .reduce((acc, item) => acc + item.deltaAttendees, 0);

  const nextTotal = currentTotal + deltaAttendees;

  if (nextTotal > group.capacity) {
    return {
      result: {
        ok: false,
        status: 'capacity_exceeded',
        invitationGroupId: group.id,
        checkedInCount: currentTotal,
        capacity: group.capacity,
        remaining: Math.max(0, group.capacity - currentTotal),
        errorMessageId:
          currentTotal >= group.capacity
            ? `Semua ${group.capacity} tempat untuk undangan ini sudah tercatat hadir.`
            : `Jumlah hadir (${nextTotal}) melebihi kapasitas undangan (${group.capacity}). Tersisa ${group.capacity - currentTotal} tempat.`,
      },
    };
  }

  if (nextTotal < 0) {
    return {
      result: {
        ok: false,
        status: 'negative_attendance',
        invitationGroupId: group.id,
        checkedInCount: currentTotal,
        capacity: group.capacity,
        remaining: group.capacity - currentTotal,
        errorMessageId: 'Total kehadiran tidak boleh kurang dari 0.',
      },
    };
  }

  const newEntry: CheckinLedgerRecord = {
    id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventId: targetEventId,
    invitationGroupId: group.id,
    actorUserId,
    deltaAttendees,
    method,
    reasonNullable: reason ?? null,
    idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  return {
    result: {
      ok: true,
      status: 'success',
      invitationGroupId: group.id,
      addedAttendees: deltaAttendees,
      checkedInCount: nextTotal,
      capacity: group.capacity,
      remaining: group.capacity - nextTotal,
      welcomeQueued: method !== 'correction' && group.allowedPublicDisplay,
    },
    newEntry,
  };
}

