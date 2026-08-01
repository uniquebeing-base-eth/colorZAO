export function resolveCritiqueIdentity(input: {
  anonymous: boolean;
  username?: string | null | undefined;
  fid?: number | null | undefined;
  verifiedFid?: number | null | undefined;
}) {
  const suppliedIdentity = Boolean(input.username || input.fid || input.verifiedFid);
  const resolvedFid = input.verifiedFid ?? input.fid ?? null;
  const anonymous = input.anonymous || !suppliedIdentity;

  return {
    anonymous,
    fid: resolvedFid,
    username: anonymous ? null : (input.username ?? null),
  };
}
