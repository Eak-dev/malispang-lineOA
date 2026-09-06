# MP-06 WP5 — Toolchain Pinning and Local Closure Remediation

สถานะเอกสาร: local-only implementation ภายใต้ Roadmap `2026.09.06-v2`, MP-06 (GitHub #12), phase `WP5_LOCAL_CLOSURE_REMEDIATION`, status `AUTHORIZED_LOCAL_CLOSURE_REMEDIATION_WP5_ONLY` และ action `LOCAL_CLOSURE_REMEDIATION_WP5` ไม่มี TEST/Production deployment และ Production ยังคง `NO_GO`

## Blocker และเป้าหมาย

Clean-checkout functional audit ของ WP1–WP4 ผ่านแล้ว แต่ local acceptance ถูก block เพราะ repository ยังไม่ประกาศและบังคับ toolchain ที่ใช้สร้างหลักฐาน คือ Node.js `24.19.0` และ pnpm `11.19.0` รอบนี้ปิดเฉพาะ blocker ดังกล่าว ไม่แก้ deterministic runtime, benchmark semantics/dataset/oracle, policy, KB หรือ catalog

ระหว่าง validation พบว่า WP2 benchmark test ใช้เวลามากกว่า hard timeout เดิม `60_000` มิลลิวินาทีและทำให้ dependent tests ถูก cancel/skip ทั้งที่ benchmark semantics ผ่าน Owner จึงอนุมัติ scope `MP_06_WP5_BENCHMARK_TEST_TIMEOUT_ONLY` ให้เปลี่ยนเฉพาะ `beforeAll` timeout ใน `tests/mp-06-wp2-benchmark.test.ts` เป็น `120_000` มิลลิวินาที ค่านี้เป็น hard safety ceiling ไม่ใช่ performance acceptance threshold ไม่มี assertion, retry, case, dataset, oracle, evaluator, threshold, report หรือ failure-exit behavior เปลี่ยนแปลง

Targeted WP2 suite หลังแก้ผ่านต่อเนื่อง 5 รอบโดยไม่แก้ source ระหว่างรอบ: `30.05`, `29.29`, `30.23`, `46.13`, `101.74` วินาที; minimum `29.29`, median `30.23`, maximum `101.74` วินาที ทุกครั้งผ่าน 14/14 tests, ไม่มี skipped/cancelled/failed/timeout, ใช้ 5,000 cases เดิม และคง dataset/result checksums กับ tracked benchmark artifacts เดิม

## Source of truth และ declarations

`package.json` เป็น authoritative source และกำหนด:

- `packageManager`: `pnpm@11.19.0`
- `engines.node`: `24.19.0`
- `engines.pnpm`: `11.19.0`
- `preinstall`: dependency-free fail-fast validator
- `validate:toolchain`: explicit validation command
- `check`: เรียก toolchain validator ก่อน quality gates อื่น

`.node-version` ต้องมี `24.19.0` และ validator ตรวจให้ตรงกับ `package.json` โดยอัตโนมัติ ไม่มี `.nvmrc` หรือ declaration ซ้ำอื่น เพราะเพิ่มหลายแหล่งโดยไม่จำเป็นจะเพิ่มโอกาส drift

ไม่ได้ใช้ `packageManagerStrictVersion`, `managePackageManagerVersions` หรือ `packageManagerStrict` ซึ่งเป็น obsolete settings และ validator จะปฏิเสธหากมีการเพิ่มใน `.npmrc` หรือ `pnpm-workspace.yaml` ภายหลัง pnpm `11.19.0` ที่ตรวจในรอบนี้รายงาน `pmOnFail=ignore`; enforcement หลักจึงมาจาก exact `packageManager`/`engines`, `preinstall` และ validator ไม่ใช้การดาวน์โหลดหรือสลับเวอร์ชันอัตโนมัติ

## Bootstrap บนเครื่องใหม่

1. ติดตั้งหรือ activate Node.js `24.19.0` ด้วย version manager ที่องค์กรอนุมัติและอ่าน `.node-version`
2. ตรวจ Node:

   ```sh
   node --version
   ```

   ต้องได้ `v24.19.0`

3. ติดตั้ง package manager แบบ exact:

   ```sh
   npm install --global pnpm@11.19.0
   pnpm --version
   ```

   ต้องได้ `11.19.0` ห้ามใช้ range หรือคำสั่งที่เลือก latest อัตโนมัติ

4. ตรวจ contract ก่อน install:

   ```sh
   node scripts/validate-toolchain.mjs
   ```

5. ติดตั้ง dependencies จาก committed lockfile แล้วตรวจซ้ำ:

   ```sh
   pnpm install --frozen-lockfile
   pnpm validate:toolchain
   pnpm check
   ```

Corepack ไม่ใช่ dependency ของวิธีนี้ เพราะ runtime ที่ตรวจในรอบ WP5 ไม่มี Corepack command ส่วน Node distribution ปกติที่มี npm ใช้คำสั่งข้อ 3 ได้ตรง ๆ สำหรับ audit host นี้ bundled Node ไม่มี npm จึงทดสอบคำสั่งเดียวกันด้วย npm `11.6.2` แบบชั่วคราวจาก package registry แล้วติดตั้ง pnpm `11.19.0` ลง isolated prefix สำเร็จ โดยไม่แก้ global package ของเครื่อง ขั้นนี้ใช้ pnpm ที่ pin อยู่แล้วเพื่อเรียก npm ชั่วคราว จึงเป็นการตรวจวิธีติดตั้ง ไม่ใช่หลักฐาน bootstrap แบบ zero-toolchain

## Validator และ fail-fast behavior

`scripts/validate-toolchain.mjs` ใช้เฉพาะ Node built-ins จึงทำงานก่อน dependency installation และไม่เรียก network ไม่อ่าน secret ไม่พิมพ์ environment variables ไม่แก้ไฟล์ และไม่ดาวน์โหลด software

Validator ตรวจ actual Node/pnpm, `packageManager`, `engines.node`, `engines.pnpm`, `.node-version` และ obsolete pnpm settings ทุก mismatch คืน exit code `1` พร้อม expected/actual แบบ sanitized และวิธีแก้ การทดสอบ inject version values เข้า pure decision function จึงพิสูจน์ patch/major/minor mismatch โดยไม่ติดตั้ง toolchain ผิดจริง

Unit test ที่อ่าน declarations จาก repository inject ค่า toolchain ที่ตรวจแล้วเพื่อไม่ spawn package manager ซ้ำระหว่าง Vitest parallel suite ส่วน actual runtime versions ถูกตรวจแยกโดย `pnpm validate:toolchain` และ `preinstall`; จึงไม่ลด fail-fast coverage และหลีกเลี่ยง test timeout ที่ไม่เกี่ยวกับ contract semantics

หลักฐานที่ต้องผ่าน:

- Node `24.19.0` + pnpm `11.19.0`: exit `0`
- simulated Node ต่ำกว่า/สูงกว่า/major-minor ผิด: exit `1`
- simulated pnpm ต่ำกว่า/สูงกว่า/major-minor ผิด: exit `1`
- declaration drift, missing `.node-version`, non-pnpm, range, malformed version และ obsolete setting: exit `1`
- error output ไม่ echo malformed value, secret หรือ environment dump

`preinstall` ป้องกัน install ปกติ แต่ `--ignore-scripts` อาจข้าม lifecycle hook ได้ ดังนั้น `validate:toolchain` ยังคงอยู่ต้น `pnpm check` และต้องรันแยกใน clean-checkout verification

## Dependency และ network policy

WP5 ไม่ใช่ offline/hermetic build การดาวน์โหลด package จาก registry ไม่เป็น blocker เมื่อ package ถูกประกาศใน repository, ใช้ committed `pnpm-lock.yaml`, integrity metadata ผ่าน และ install ด้วย `--frozen-lockfile` ห้าม dependency จากแหล่งที่ไม่ประกาศ, credential ใหม่, private mirror, vendoring, commit binary หรือ `node_modules`

WP5 ไม่เปลี่ยน dependency version หรือ resolution หาก toolchain metadata ไม่ต้องแก้ lockfile จะไม่แตะ lockfile การตรวจ clean checkout ใช้ isolated empty pnpm store เพื่อพิสูจน์ว่าข้อมูลใน lockfile เพียงพอ โดย network ใช้เฉพาะ package registry ที่ lockfile อ้างอิง

## CI

Repository ไม่มี CI workflow ณ WP5 preflight และ control ไม่อนุญาตสร้าง workflow ใหม่ จึงไม่มี CI file เปลี่ยนแปลง Validator และ local clean-checkout verification เป็นหลักฐานในรอบนี้ หากเพิ่ม CI ภายหลัง ต้อง pin Node/pnpm ค่าเดียวกันและเรียก `pnpm validate:toolchain` ก่อน validation หลักภายใต้ authorization ใหม่

## การอัปเกรดในอนาคต

การเปลี่ยน Node หรือ pnpm ต้องมี Owner/PO control transition ใหม่ แล้วเปลี่ยนอย่างน้อย:

1. `package.json` — `packageManager`, `engines.node`, `engines.pnpm`
2. `.node-version`
3. constants และ tests ใน `scripts/validate-toolchain.mjs` / `tests/toolchain-contract.test.ts`
4. เอกสารนี้และ README
5. existing CI configuration หากมีในเวลานั้น

จากนั้นต้องใช้ validator ตรวจ declaration drift, install ด้วย empty store/frozen lockfile และรัน full quality gates ใหม่ ห้ามเปลี่ยนเพียง declaration จุดเดียว

## Known limitations

- Version-manager installation อยู่นอก repository; validator ตรวจผลลัพธ์ แต่ไม่ติดตั้ง Node/pnpm ให้
- Audit host มี pnpm ที่ pin อยู่แล้วแต่ bundled Node ไม่มี npm/Corepack จึงไม่ได้พิสูจน์ zero-toolchain bootstrap; เครื่องใหม่ต้อง provision Node distribution/approved version manager ที่มี npm ก่อน
- Package registry เป็น network dependency ที่ประกาศชัดเจน ไม่ได้ทำ offline mirror
- ไม่มี CI workflow จึงยังไม่มี hosted-runner evidence
- Benchmark duration แปรผันตามทรัพยากรของ local host; รอบยืนยันสูงสุด `101.74` วินาทีแต่ยังต่ำกว่า hard ceiling `120` วินาที จึงยังไม่ใช่ performance SLA
- WP5 ไม่พิสูจน์ AI/NLU semantic interpretation, TEST readiness/deployment, Owner TEST UAT หรือ Production readiness
- ไม่มี AI provider, model, prompt, secret, LINE OA/Cloudflare mutation หรือ deployment ในรอบนี้
