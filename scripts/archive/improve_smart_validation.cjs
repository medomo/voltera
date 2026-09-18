const fs = require('fs');
let code = fs.readFileSync('src/components/CollectorDashboard.tsx', 'utf8');

// Change `currentReadingVal <= previousReading` to `<` in submit handler
code = code.replace(
  'if (!selectedSub || currentReadingVal <= previousReading) return;',
  'if (!selectedSub || currentReadingVal < previousReading) return;'
);

code = code.replace(
  'min={previousReading + 1}',
  'min={previousReading}'
);

code = code.replace(
  'placeholder={`يجب أن تكون أكبر من ${previousReading}`}',
  'placeholder={`يجب أن تكون ${previousReading} أو أكبر`}'
);

code = code.replace(
  '{currentReadingVal > previousReading && (',
  '{currentReadingVal >= previousReading && currentReadingInput !== \'\' && ('
);

const submitButtonOld = `                        <button
                          type="submit"
                          disabled={currentReadingVal <= previousReading || selectedSub.status === 'suspended'}
                          className={\`w-full font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer \${
                            currentReadingVal > previousReading && selectedSub.status !== 'suspended'
                              ? 'bg-slate-900 text-white hover:bg-slate-850 active:scale-95'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }\`}
                        >
                          حفظ القراءة وإصدار الفاتورة مؤقتاً
                        </button>`;

const submitButtonNew = `                        <button
                          type="submit"
                          disabled={currentReadingVal < previousReading || selectedSub.status === 'suspended'}
                          className={\`w-full font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer \${
                            currentReadingVal >= previousReading && selectedSub.status !== 'suspended'
                              ? consumption > 1000 ? 'bg-amber-500 text-slate-900 hover:bg-amber-600 active:scale-95' : 'bg-slate-900 text-white hover:bg-slate-850 active:scale-95'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }\`}
                        >
                          {consumption > 1000 ? 'تأكيد وإصدار الفاتورة (استهلاك مرتفع)' : 'حفظ القراءة وإصدار الفاتورة مؤقتاً'}
                        </button>`;

code = code.replace(submitButtonOld, submitButtonNew);

const validationUI = `                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 text-right">أدخل القراءة الجديدة للعداد</label>
                          <input
                            type="number"
                            required
                            min={previousReading}
                            value={currentReadingInput}
                            onChange={e => {
                              setCurrentReadingInput(e.target.value);
                              setReadingSuccess(null);
                            }}
                            placeholder={\`يجب أن تكون \${previousReading} أو أكبر\`}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-right text-sm focus:outline-none focus:border-slate-900"
                          />
                          {currentReadingInput !== '' && currentReadingVal < previousReading && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 mt-2 justify-end">
                                <span>القراءة المدخلة أقل من السابقة ({previousReading})!</span>
                                <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {currentReadingInput !== '' && currentReadingVal >= previousReading && consumption > 1000 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200 justify-end text-right">
                                <span>تحذير ذكي: الاستهلاك المحسوب ({consumption} ك.و) مرتفع جداً. يرجى المراجعة.</span>
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                            </div>
                          )}
                        </div>`;

const inputBlockOld = `                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 text-right">أدخل القراءة الجديدة للعداد</label>
                          <input
                            type="number"
                            required
                            min={previousReading}
                            value={currentReadingInput}
                            onChange={e => {
                              setCurrentReadingInput(e.target.value);
                              setReadingSuccess(null);
                            }}
                            placeholder={\`يجب أن تكون \${previousReading} أو أكبر\`}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-right text-sm focus:outline-none focus:border-slate-900"
                          />
                        </div>`;

code = code.replace(inputBlockOld, validationUI);

fs.writeFileSync('src/components/CollectorDashboard.tsx', code);
console.log('Validation improved.');
