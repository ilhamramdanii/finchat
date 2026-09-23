import { Injectable } from '@nestjs/common';
import { ParserService, ParseResult } from '../parser/parser.service';
import { normalizeIdNumberWords } from '../parser/id-number-words';

export interface VoiceParseOutcome {
  transcript: string;
  normalized: string;
  result: ParseResult;
}

@Injectable()
export class VoiceService {
  constructor(private readonly parser: ParserService) {}

  // Parse murni tanpa akses DB: transcript → normalisasi terbilang →
  // ParserService yang sama dengan jalur WA. Tidak menyimpan apa pun;
  // penyimpanan tetap lewat POST /transactions (source=VOICE).
  parse(text: string): VoiceParseOutcome {
    const transcript = text.trim();
    const normalized = normalizeIdNumberWords(transcript);
    const result = this.parser.parse(transcript);
    return { transcript, normalized, result };
  }
}
