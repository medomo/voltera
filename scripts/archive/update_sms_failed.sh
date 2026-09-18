cat << 'INNER_EOF' > sms_failed_chunk.tsx
            {activeSection === 'sms-failed' && (
              <motion.div
                key="sms-failed-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center justify-end gap-2 mb-6 border-b border-slate-800 pb-3">
                    <span>الرسائل غير المرسلة</span>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Unsent Readings */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                      <h3 className="text-sm font-bold text-amber-500 flex justify-end gap-2 mb-4 border-b border-slate-800/60 pb-2">
                        <span>فواتير قراءات لم تُرسل</span>
                        <FileText className="w-4 h-4" />
                      </h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {readings.filter(r => !r.smsSent).length === 0 ? (
                          <div className="text-center py-12 text-slate-600 text-xs">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                            <p>جميع إشعارات الفواتير مُرسلة بنجاح.</p>
                          </div>
                        ) : (
                          readings.filter(r => !r.smsSent).sort((a,b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime()).slice(0, 50).map(r => (
                            <div key={r.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                              <div className="flex items-center gap-3">
                                <div className="text-left font-mono font-bold text-amber-400">
                                  {r.totalAmount.toLocaleString()} {settings.currency}
                                </div>
                                <button
                                  onClick={() => handleSendReadingSMS(r)}
                                  className="p-1.5 bg-slate-800 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300 rounded-lg transition-colors cursor-pointer"
                                  title="إعادة محاولة الإرسال"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-right">
                                <h5 className="font-bold text-slate-200">{r.subscriberName}</h5>
                                <p className="text-[10px] text-slate-500">
                                  العداد: {r.meterNumber} | {r.readingDate}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Unsent Payments */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                      <h3 className="text-sm font-bold text-emerald-500 flex justify-end gap-2 mb-4 border-b border-slate-800/60 pb-2">
                        <span>سندات قبض لم تُرسل</span>
                        <Wallet className="w-4 h-4" />
                      </h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {payments.filter(p => !p.smsSent).length === 0 ? (
                          <div className="text-center py-12 text-slate-600 text-xs">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                            <p>جميع سندات القبض مُرسلة بنجاح.</p>
                          </div>
                        ) : (
                          payments.filter(p => !p.smsSent).sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).slice(0, 50).map(p => (
                            <div key={p.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                              <div className="flex items-center gap-3">
                                <div className="text-left font-mono font-bold text-emerald-400">
                                  {p.amountPaid.toLocaleString()} {settings.currency}
                                </div>
                                <button
                                  onClick={() => handleSendPaymentSMS(p)}
                                  className="p-1.5 bg-slate-800 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300 rounded-lg transition-colors cursor-pointer"
                                  title="إعادة محاولة الإرسال"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-right">
                                <h5 className="font-bold text-slate-200">{p.subscriberName}</h5>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  رقم السند: {p.receiptNumber} | {p.paymentDate}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
INNER_EOF
sed -i -e '/{activeSection === '\''sms-send'\'' && (/r sms_failed_chunk.tsx' src/components/AdminDashboard.tsx
