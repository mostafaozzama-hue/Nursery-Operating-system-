import { Module } from '@nestjs/common';
import { CreditNoteRepository } from './credit-note.repository';
import { CreditNoteService } from './credit-note.service';

/** No controller - deliberately minimal, see credit-note.repository.ts. */
@Module({
  providers: [CreditNoteService, CreditNoteRepository],
  exports: [CreditNoteService],
})
export class CreditNoteModule {}
