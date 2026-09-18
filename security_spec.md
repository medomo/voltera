# Security Specification & Test Runner

## Data Invariants
1. A meter reading or payment receipt cannot be created without valid subscriber reference.
2. System settings can only be written by authenticated users.
3. Users collection stores roles and permissions; user profiles are readable by authenticated users and writable by system or authenticated users.

## Dirty Dozen Security Test Payloads
1. Anonymous user attempting to create/read subscribers.
2. Unauthenticated write to `/settings/global`.
3. Reading or writing junk IDs or malicious script payloads.
4. Attempting to bypass role validation on user profiles.
5. Tampering with meter reading consumption values.
6. Overwriting audit logs without valid user identity.
7. Attempting shadow field injections into payments.
8. Deleting subscribers without authentication.
9. Modifying inventory items without valid session.
10. Spoofing timestamps on receipts.
11. Reading user PII without authentication.
12. Creating invalid document path injections.
