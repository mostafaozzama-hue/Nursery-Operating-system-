import type { AdmissionResponse, CreateAdmissionRequest } from '@nursery-os/contracts';
import { post } from '../client';

export const admissions = {
  create: (body: CreateAdmissionRequest) => post<AdmissionResponse>('/admissions', body),
};
