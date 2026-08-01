'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/common/badge';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { fullName as childFullName } from '@/lib/children/mapper';
import { useChildDirectory } from '@/lib/children/queries';
import { fullName as guardianFullName } from '@/lib/guardians/mapper';
import { useGuardianDirectory } from '@/lib/guardians/queries';
import {
  INVOICE_STATUS_BADGE_VARIANT,
  INVOICE_STATUS_LABEL,
  formatInvoiceDate,
  formatMoney,
} from '@/lib/invoices/mapper';
import { useAddLineItem, useIssueInvoice, useVoidInvoice } from '@/lib/invoices/mutations';
import { useInvoice, useInvoiceLineItems, useInvoicePayments } from '@/lib/invoices/queries';
import {
  emptyLineItemFormValues,
  lineItemFormSchema,
  type LineItemFormValues,
} from '@/lib/invoices/schema';
import { PAYMENT_METHOD_LABEL } from '@/lib/payments/mapper';
import { RecordPaymentSheet } from '@/components/payments/record-payment-sheet';
import { LineItemRow } from './line-item-row';

const PAYABLE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const { data, isLoading, error, refetch } = useInvoice(invoiceId);
  const { byId: childrenById, isLoading: childrenLoading } = useChildDirectory();
  const { byId: guardiansById, isLoading: guardiansLoading } = useGuardianDirectory();
  const lineItems = useInvoiceLineItems(invoiceId);
  const payments = useInvoicePayments(invoiceId);

  const { mutate: issueInvoice, isPending: isIssuing, error: issueError } = useIssueInvoice();
  const { mutate: voidInvoice, isPending: isVoiding } = useVoidInvoice();
  const {
    mutate: addLineItem,
    isPending: isAddingLineItem,
    error: addLineItemError,
  } = useAddLineItem();

  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [newLineItem, setNewLineItem] = useState<LineItemFormValues>(emptyLineItemFormValues);
  const [newLineItemErrors, setNewLineItemErrors] = useState<
    Partial<Record<keyof LineItemFormValues, string>>
  >({});

  const isLoadingAny = isLoading || childrenLoading || guardiansLoading;

  const handleIssue = async () => {
    try {
      await issueInvoice(invoiceId, {});
      refetch();
    } catch {
      // surfaced via issueError below
    }
  };

  const handleVoid = async () => {
    try {
      await voidInvoice(invoiceId);
      setVoidConfirmOpen(false);
      refetch();
    } catch {
      // mutation hook captured the error; dialog stays open to retry/cancel
    }
  };

  const handleAddLineItem = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = lineItemFormSchema.safeParse(newLineItem);
    if (!result.success) {
      const errors: Partial<Record<keyof LineItemFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof LineItemFormValues] = issue.message;
      }
      setNewLineItemErrors(errors);
      return;
    }
    setNewLineItemErrors({});

    try {
      await addLineItem(invoiceId, {
        description: result.data.description.trim(),
        quantity: Number(result.data.quantity),
        unitAmount: Number(result.data.unitAmount),
      });
      setNewLineItem(emptyLineItemFormValues);
      refetch();
      lineItems.refetch();
    } catch {
      // surfaced via addLineItemError below
    }
  };

  if (isLoadingAny) {
    return <p>Loading…</p>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive">
          {isApiError(error) ? error.message : 'Something went wrong.'}
        </p>
        <Button variant="outline" size="sm" onClick={refetch} className="w-fit">
          Retry
        </Button>
      </div>
    );
  }

  const child = childrenById.get(data.childId);
  const guardian = guardiansById.get(data.billedToGuardianId);
  const isDraft = data.status === 'DRAFT';
  const isVoid = data.status === 'VOID';
  const canPay = PAYABLE_STATUSES.includes(data.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          Invoice {child ? `· ${childFullName(child)}` : ''}
        </h1>
        <div className="flex gap-2">
          {canManage && isDraft && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/invoices/${invoiceId}/edit`}>Edit</Link>
            </Button>
          )}
          {canManage && !isVoid && (
            <Button variant="destructive" onClick={() => setVoidConfirmOpen(true)}>
              Void
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <Badge variant={INVOICE_STATUS_BADGE_VARIANT[data.status]}>
            {INVOICE_STATUS_LABEL[data.status]}
          </Badge>
        </CardHeader>
        <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Child</dt>
          <dd>
            {child ? (
              <Link href={`/dashboard/children/${data.childId}`} className="hover:underline">
                {childFullName(child)}
              </Link>
            ) : (
              '—'
            )}
          </dd>
          <dt className="text-muted-foreground">Billed to</dt>
          <dd>
            {guardian ? (
              <Link
                href={`/dashboard/guardians/${data.billedToGuardianId}`}
                className="hover:underline"
              >
                {guardianFullName(guardian)}
              </Link>
            ) : (
              '—'
            )}
          </dd>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-medium">{formatMoney(data.totalAmount)}</dd>
          <dt className="text-muted-foreground">Due date</dt>
          <dd>{data.dueDate ? formatInvoiceDate(data.dueDate) : '—'}</dd>
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          {isDraft && canManage && (
            <Button size="sm" disabled={isIssuing} onClick={handleIssue}>
              {isIssuing ? 'Issuing…' : 'Issue invoice'}
            </Button>
          )}
        </CardHeader>

        {issueError != null && (
          <p className="mb-2 text-sm text-destructive">
            {isApiError(issueError) ? issueError.message : 'Something went wrong.'}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {lineItems.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lineItems.data.length === 0 ? (
            <EmptyState message="No line items yet." />
          ) : (
            lineItems.data.map((item) => (
              <LineItemRow
                key={item.id}
                invoiceId={invoiceId}
                lineItem={item}
                editable={isDraft && canManage}
                onChanged={() => {
                  refetch();
                  lineItems.refetch();
                }}
              />
            ))
          )}
        </div>

        {isDraft && canManage && (
          <form
            onSubmit={handleAddLineItem}
            className="mt-4 flex flex-col gap-2 rounded-lg border border-border p-3"
          >
            <Label className="text-sm font-medium">Add line item</Label>
            <div className="flex flex-col gap-1.5">
              <Input
                placeholder="Description"
                value={newLineItem.description}
                onChange={(event) =>
                  setNewLineItem((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              {newLineItemErrors.description && (
                <p className="text-sm text-destructive">{newLineItemErrors.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Input
                  placeholder="Quantity"
                  value={newLineItem.quantity}
                  onChange={(event) =>
                    setNewLineItem((prev) => ({ ...prev, quantity: event.target.value }))
                  }
                />
                {newLineItemErrors.quantity && (
                  <p className="text-sm text-destructive">{newLineItemErrors.quantity}</p>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Input
                  placeholder="Unit amount"
                  value={newLineItem.unitAmount}
                  onChange={(event) =>
                    setNewLineItem((prev) => ({ ...prev, unitAmount: event.target.value }))
                  }
                />
                {newLineItemErrors.unitAmount && (
                  <p className="text-sm text-destructive">{newLineItemErrors.unitAmount}</p>
                )}
              </div>
            </div>
            {addLineItemError != null && (
              <p className="text-sm text-destructive">
                {isApiError(addLineItemError) ? addLineItemError.message : 'Something went wrong.'}
              </p>
            )}
            <Button type="submit" size="sm" className="w-fit" disabled={isAddingLineItem}>
              {isAddingLineItem ? 'Adding…' : 'Add'}
            </Button>
          </form>
        )}
      </Card>

      {!isDraft && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            {canPay && (
              <Button size="sm" onClick={() => setPaymentSheetOpen(true)}>
                Record payment
              </Button>
            )}
          </CardHeader>

          {payments.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : payments.data.length === 0 ? (
            <EmptyState message="No payments recorded yet." />
          ) : (
            <div className="flex flex-col gap-2">
              {payments.data.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{PAYMENT_METHOD_LABEL[payment.paymentMethod]}</span>
                  <span className="text-muted-foreground">{formatInvoiceDate(payment.paidAt)}</span>
                  <span className="font-medium">{formatMoney(payment.amountApplied)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={voidConfirmOpen}
        onOpenChange={setVoidConfirmOpen}
        title="Void invoice"
        description="This invoice will be marked void. Existing line items and payments are kept for the historical record. This cannot be undone."
        confirmLabel="Void invoice"
        isPending={isVoiding}
        onConfirm={handleVoid}
      />

      <RecordPaymentSheet
        guardianId={data.billedToGuardianId}
        open={paymentSheetOpen}
        onOpenChange={setPaymentSheetOpen}
        onDone={() => {
          setPaymentSheetOpen(false);
          refetch();
          payments.refetch();
        }}
      />
    </div>
  );
}
