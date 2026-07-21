import { validate } from 'class-validator';
import { IsIanaTimezone } from './is-iana-timezone.decorator';

class Fixture {
  @IsIanaTimezone()
  timezone!: string;
}

describe('IsIanaTimezone', () => {
  it('accepts a real IANA timezone', async () => {
    const fixture = new Fixture();
    fixture.timezone = 'America/New_York';
    expect(await validate(fixture)).toHaveLength(0);
  });

  it('accepts UTC', async () => {
    const fixture = new Fixture();
    fixture.timezone = 'UTC';
    expect(await validate(fixture)).toHaveLength(0);
  });

  it('rejects a nonexistent timezone string', async () => {
    const fixture = new Fixture();
    fixture.timezone = 'Not/A_Real_Zone';
    const errors = await validate(fixture);
    expect(errors).toHaveLength(1);
  });

  it('rejects a non-string value', async () => {
    const fixture = new Fixture();
    fixture.timezone = 123 as unknown as string;
    const errors = await validate(fixture);
    expect(errors).toHaveLength(1);
  });
});
