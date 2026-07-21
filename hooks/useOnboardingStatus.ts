import { useAuth } from './useAuth';
import { useAthletes } from './useAthletes';

// Onboarding is "incomplete" for a parent who's missing their name, phone,
// or hasn't added a daughter yet. Coaches never need it -- they already
// give their name when they create the team. Keyed off *completeness*, not
// "is this the first login," so a second device signing into an
// already-onboarded account skips straight past this.
export function useOnboardingStatus() {
  const { teamMember } = useAuth();
  const isParent = teamMember?.role === 'parent';
  const { data: athletes, isLoading: athletesLoading } = useAthletes();

  if (!teamMember || !isParent) {
    return { needsOnboarding: false, loading: false };
  }

  if (athletesLoading || athletes === undefined) {
    return { needsOnboarding: false, loading: true };
  }

  const needsOnboarding = !teamMember.full_name || !teamMember.phone || athletes.length === 0;
  return { needsOnboarding, loading: false };
}
