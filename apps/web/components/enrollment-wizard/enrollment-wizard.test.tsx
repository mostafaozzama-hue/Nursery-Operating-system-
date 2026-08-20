import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnrollmentWizard } from './enrollment-wizard';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn() }),
}));

const createAdmissionMock = jest.fn();
jest.mock('@/lib/admissions/mutations', () => ({
  useCreateAdmission: () => ({ mutate: createAdmissionMock, isPending: false, error: null }),
}));

const uploadPhotoMock = jest.fn();
jest.mock('@/lib/children/mutations', () => ({
  useUploadChildPhoto: () => ({ mutate: uploadPhotoMock, isPending: false, error: null }),
}));

/**
 * Covers the Enrollment Wizard's Cancel action only - Back/Next/Enroll and
 * the individual steps' own field behavior are unchanged (see the task's
 * explicit "keep existing Back/Next behavior" and "do not modify the
 * backend" constraints) and aren't re-derived here. Only Step 1 (Child)
 * needs to be exercised - none of its own subtree fetches anything over the
 * network, unlike Guardians/Enrollment/Review's pickers, so no additional
 * hook mocking is needed to reach a "data entered" state.
 */
describe('EnrollmentWizard - Cancel', () => {
  beforeEach(() => {
    pushMock.mockClear();
    createAdmissionMock.mockClear();
    uploadPhotoMock.mockClear();
  });

  it('navigates straight to /dashboard/children with no confirmation when nothing has been entered', async () => {
    const user = userEvent.setup();
    render(<EnrollmentWizard />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Cancel enrollment?')).not.toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith('/dashboard/children');
  });

  it('shows a confirmation dialog when data has been entered', async () => {
    const user = userEvent.setup();
    render(<EnrollmentWizard />);

    await user.type(screen.getByLabelText('First name'), 'Ava');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('Cancel enrollment?')).toBeInTheDocument();
    expect(screen.getByText('Your entered information will be lost.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('"Keep editing" closes the dialog, preserves entered data, and does not navigate', async () => {
    const user = userEvent.setup();
    render(<EnrollmentWizard />);

    const firstNameInput = screen.getByLabelText('First name');
    await user.type(firstNameInput, 'Ava');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByText('Cancel enrollment?');

    await user.click(screen.getByRole('button', { name: 'Keep editing' }));

    await waitFor(() => expect(screen.queryByText('Cancel enrollment?')).not.toBeInTheDocument());
    expect(screen.getByLabelText('First name')).toHaveValue('Ava');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('"Cancel enrollment" discards the wizard and navigates to /dashboard/children', async () => {
    const user = userEvent.setup();
    render(<EnrollmentWizard />);

    await user.type(screen.getByLabelText('First name'), 'Ava');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByText('Cancel enrollment?');

    await user.click(screen.getByRole('button', { name: 'Cancel enrollment' }));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/children');
  });

  it('never calls the admission/photo mutations when cancelling, with or without entered data', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<EnrollmentWizard />);

    // No data entered.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(createAdmissionMock).not.toHaveBeenCalled();
    expect(uploadPhotoMock).not.toHaveBeenCalled();
    unmount();

    // Data entered, then confirmed.
    render(<EnrollmentWizard />);
    await user.type(screen.getByLabelText('First name'), 'Ava');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByText('Cancel enrollment?');
    await user.click(screen.getByRole('button', { name: 'Cancel enrollment' }));

    expect(createAdmissionMock).not.toHaveBeenCalled();
    expect(uploadPhotoMock).not.toHaveBeenCalled();
  });

  it('shows no Back button on Step 1, and shows Back once past it', async () => {
    const user = userEvent.setup();
    render(<EnrollmentWizard />);

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('First name'), 'Ava');
    await user.type(screen.getByLabelText('Last name'), 'Smith');
    await user.type(screen.getByLabelText('Date of birth'), '2022-03-15');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
