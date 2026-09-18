const fs = require('fs');
let code = fs.readFileSync('src/components/CollectorDashboard.tsx', 'utf8');

const paymentInputOld = `                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 text-right">المبلغ المستلم للتحصيل</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max={selectedSub.currentBalance > 0 ? selectedSub.currentBalance * 2 : 1000000}
                            value={amountPaidInput}
                            onChange={e => {
                              setAmountPaidInput(e.target.value);
                              setPaymentSuccess(null);
                            }}
                            placeholder="أدخل قيمة المبلغ النقدي"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-right text-sm focus:outline-none focus:border-slate-900"
                          />
                        </div>`;

const paymentInputNew = `                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 text-right">المبلغ المستلم للتحصيل</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={amountPaidInput}
                            onChange={e => {
                              setAmountPaidInput(e.target.value);
                              setPaymentSuccess(null);
                            }}
                            placeholder="أدخل قيمة المبلغ النقدي"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-right text-sm focus:outline-none focus:border-slate-900"
                          />
                          {parseFloat(amountPaidInput) > selectedSub.currentBalance && selectedSub.currentBalance > 0 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200 justify-end text-right">
                                <span>المبلغ المدخل ({parseFloat(amountPaidInput).toLocaleString()} ${code.includes('settings.currency') ? '{settings.currency}' : 'ريال'}) أكبر من الرصيد المستحق، سيقيد الفارق كرصيد دائن.</span>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            </div>
                          )}
                          {parseFloat(amountPaidInput) > 1000000 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 mt-2 justify-end text-right">
                                <span>تنبيه: المبلغ المدخل ضخم جداً. يرجى المراجعة.</span>
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            </div>
                          )}
                        </div>`;

code = code.replace(paymentInputOld, paymentInputNew);

fs.writeFileSync('src/components/CollectorDashboard.tsx', code);
console.log('Payment Validation improved.');
