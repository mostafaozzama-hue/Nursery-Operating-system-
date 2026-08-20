import {
  emptyChildFormValues,
  emptyEnrollmentStepValues,
  emptyGuardianSlot,
  isWizardEmpty,
} from './schema';

describe('isWizardEmpty', () => {
  const freshMother = emptyGuardianSlot('MOTHER', true, { isEmergencyContact: true, canPickup: true });
  const freshFather = emptyGuardianSlot('FATHER', true, { isEmergencyContact: true, canPickup: true });
  const freshAdditional = emptyGuardianSlot('OTHER', false);

  it('is true for a completely untouched wizard (mother/father default to included, that alone is not "entered data")', () => {
    expect(
      isWizardEmpty(
        emptyChildFormValues,
        freshMother,
        freshFather,
        freshAdditional,
        emptyEnrollmentStepValues,
        null,
      ),
    ).toBe(true);
  });

  it('is false once any Child field is typed', () => {
    expect(
      isWizardEmpty(
        { ...emptyChildFormValues, firstName: 'Ava' },
        freshMother,
        freshFather,
        freshAdditional,
        emptyEnrollmentStepValues,
        null,
      ),
    ).toBe(false);
  });

  it('is false once a guardian slot is edited (e.g. switched to "create new")', () => {
    expect(
      isWizardEmpty(
        emptyChildFormValues,
        { ...freshMother, mode: 'new' },
        freshFather,
        freshAdditional,
        emptyEnrollmentStepValues,
        null,
      ),
    ).toBe(false);
  });

  it('is false once an enrollment field is set (e.g. plannedEndDate)', () => {
    expect(
      isWizardEmpty(
        emptyChildFormValues,
        freshMother,
        freshFather,
        freshAdditional,
        { ...emptyEnrollmentStepValues, plannedEndDate: '2027-06-30' },
        null,
      ),
    ).toBe(false);
  });

  it('is false once a photo file has been selected', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    expect(
      isWizardEmpty(
        emptyChildFormValues,
        freshMother,
        freshFather,
        freshAdditional,
        emptyEnrollmentStepValues,
        file,
      ),
    ).toBe(false);
  });
});
