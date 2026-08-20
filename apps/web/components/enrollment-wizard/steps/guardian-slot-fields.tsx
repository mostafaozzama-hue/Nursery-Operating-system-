'use client';

import type { RelationshipType } from '@nursery-os/contracts';
import { GuardianPicker } from '@/components/child-guardians/guardian-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { relationshipTypeLabel } from '@/lib/child-guardians/mapper';
import { fullName } from '@/lib/guardians/mapper';
import type { GuardianSlotValues } from '@/lib/admissions/schema';

const ADDITIONAL_RELATIONSHIP_TYPES: RelationshipType[] = [
  'GRANDPARENT',
  'LEGAL_GUARDIAN',
  'RELATIVE',
  'OTHER',
];

/**
 * One guardian slot in the wizard's Parents & Guardians step (Mother,
 * Father, or the optional Additional guardian) - Easy Enrollment, Product
 * Gap H. `label` is the slot's fixed heading; `excludeIds` keeps the same
 * guardian from being picked twice across slots. `relationshipTypeSelectable`
 * is only true for the Additional slot - Mother/Father's relationshipType is
 * fixed by the slot itself.
 */
export function GuardianSlotFields({
  label,
  slot,
  onChange,
  excludeIds,
  optional,
  relationshipTypeSelectable,
  error,
}: {
  label: string;
  slot: GuardianSlotValues;
  onChange: (partial: Partial<GuardianSlotValues>) => void;
  excludeIds: string[];
  optional: boolean;
  relationshipTypeSelectable: boolean;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">{label}</p>
        {optional && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={slot.included}
              onChange={(event) => onChange({ included: event.target.checked })}
            />
            Include
          </label>
        )}
      </div>

      {slot.included && (
        <>
          {relationshipTypeSelectable && (
            <div className="flex flex-col gap-1.5">
              <Label>Relationship</Label>
              <Select
                value={slot.relationshipType}
                onValueChange={(value) => onChange({ relationshipType: value as RelationshipType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDITIONAL_RELATIONSHIP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {relationshipTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant={slot.mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ mode: 'existing' })}
            >
              Search existing
            </Button>
            <Button
              type="button"
              variant={slot.mode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ mode: 'new' })}
            >
              Create new
            </Button>
          </div>

          {slot.mode === 'existing' ? (
            slot.existingGuardian ? (
              <div>
                <p className="text-sm text-muted-foreground">Guardian</p>
                <p className="font-medium">{fullName(slot.existingGuardian)}</p>
                <p className="text-sm text-muted-foreground">
                  {slot.existingGuardian.phone ?? slot.existingGuardian.email ?? '—'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ existingGuardian: null })}
                >
                  Change
                </Button>
              </div>
            ) : (
              <GuardianPicker
                excludeIds={excludeIds}
                onSelect={(guardian) => onChange({ existingGuardian: guardian })}
              />
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>First name</Label>
                <Input
                  value={slot.newGuardian.firstName}
                  onChange={(event) =>
                    onChange({ newGuardian: { ...slot.newGuardian, firstName: event.target.value } })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Last name</Label>
                <Input
                  value={slot.newGuardian.lastName}
                  onChange={(event) =>
                    onChange({ newGuardian: { ...slot.newGuardian, lastName: event.target.value } })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone</Label>
                <Input
                  autoComplete="off"
                  value={slot.newGuardian.phone}
                  onChange={(event) =>
                    onChange({ newGuardian: { ...slot.newGuardian, phone: event.target.value } })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input
                  autoComplete="off"
                  value={slot.newGuardian.email}
                  onChange={(event) =>
                    onChange({ newGuardian: { ...slot.newGuardian, email: event.target.value } })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Address (optional)</Label>
                <Input
                  autoComplete="off"
                  value={slot.newGuardian.address}
                  onChange={(event) =>
                    onChange({ newGuardian: { ...slot.newGuardian, address: event.target.value } })
                  }
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={slot.canPickup}
              onChange={(event) => onChange({ canPickup: event.target.checked })}
            />
            Can pick up
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
