import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { 
  X, Shield, Check, ArrowLeft, Hourglass, Copy, 
  ExternalLink, User, Users, Disc, AlertCircle, Clock, CheckCircle, XCircle, Info
} from './Icons.tsx';
import { 
  VerificationRole, 
  VerificationProofMethod, 
  ArtistVerificationRequest, 
  VerificationApplicationStatus 
} from '../types.ts';

interface ArtistVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Generates code format: XX00XX-00 (where X is uppercase latin letter, 0 is digit)
export const generateVerificationCode = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const randL = () => letters[Math.floor(Math.random() * letters.length)];
  const randD = () => digits[Math.floor(Math.random() * digits.length)];
  return `${randL()}${randL()}${randD()}${randD()}${randL()}${randL()}-${randD()}${randD()}`;
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ru-RU').format(num);
};

export const ArtistVerificationModal: React.FC<ArtistVerificationModalProps> = ({ isOpen, onClose }) => {
  const {
    currentArtist,
    verificationRequests,
    submitVerificationRequest,
    getArtistVerificationCriteria,
    appSettings
  } = useStore();

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

  // Find latest request for the current artist
  const myRequest = verificationRequests.find(r => 
    currentArtist && (r.artistId === currentArtist.id || r.artistName.toLowerCase() === currentArtist.artistName.toLowerCase())
  );

  // Check 30-day cooldown if rejected
  const isRejected = myRequest?.status === 'REJECTED';
  const cooldownPeriodMs = 30 * 24 * 60 * 60 * 1000;
  const rejectedTimestamp = myRequest?.rejectedAt ? new Date(myRequest.rejectedAt).getTime() : 0;
  const timeSinceRejection = Date.now() - rejectedTimestamp;
  const canReapplyAfterCooldown = isRejected && timeSinceRejection >= cooldownPeriodMs;
  const daysRemaining = Math.max(1, Math.ceil((cooldownPeriodMs - timeSinceRejection) / (24 * 60 * 60 * 1000)));

  // Form State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [applicantRole, setApplicantRole] = useState<VerificationRole>('ARTIST');
  const [artistNameInput, setArtistNameInput] = useState('');
  const [proofMethod, setProofMethod] = useState<VerificationProofMethod>('SOCIAL');
  const [socialLink, setSocialLink] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [otherProofText, setOtherProofText] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form when modal opens or artist changes
  useEffect(() => {
    if (isOpen && currentArtist) {
      setArtistNameInput(currentArtist.artistName);
      if (!verificationCode) {
        setVerificationCode(generateVerificationCode());
      }
    }
  }, [isOpen, currentArtist]);

  if (!isOpen || !currentArtist) return null;

  // Criteria evaluation
  const criteria = getArtistVerificationCriteria(currentArtist.artistName);

  // Determine whether to show the Status / Timeline view or the Application Form
  // Show status screen if there is an active request (PENDING / IN_REVIEW), or APPROVED, or REJECTED within cooldown
  const hasActiveRequest = myRequest && (
    myRequest.status === 'PENDING' || 
    myRequest.status === 'IN_REVIEW' || 
    myRequest.status === 'APPROVED' || 
    (myRequest.status === 'REJECTED' && !canReapplyAfterCooldown)
  );

  const handleCopyCode = async () => {
    if (!verificationCode) return;
    try {
      await navigator.clipboard.writeText(verificationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleStartNewApplication = () => {
    setStep(1);
    setVerificationCode(generateVerificationCode());
  };

  const handleNextToStep2 = () => {
    if (!applicantRole) return;
    setStep(2);
  };

  const isStep2Valid = () => {
    // 1. Artist name must match
    if (!artistNameInput.trim() || artistNameInput.trim().toLowerCase() !== currentArtist.artistName.trim().toLowerCase()) {
      return false;
    }
    // 2. Proof method details
    if (proofMethod === 'SOCIAL') {
      if (!socialLink.trim()) return false;
    } else if (proofMethod === 'TELEGRAM') {
      if (!telegramUsername.trim()) return false;
    } else if (proofMethod === 'OTHER') {
      if (!otherProofText.trim()) return false;
    }
    // 3. Must meet all mandatory criteria
    if (!criteria.isAllMet) {
      return false;
    }
    return true;
  };

  const handleNextToStep3 = () => {
    if (!isStep2Valid()) return;
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!isStep2Valid()) return;
    setIsSubmitting(true);
    try {
      await submitVerificationRequest({
        artistId: currentArtist.id,
        artistName: currentArtist.artistName,
        applicantRole,
        artistNameCheck: artistNameInput.trim(),
        proofMethod,
        socialLink: proofMethod === 'SOCIAL' ? socialLink.trim() : undefined,
        verificationCode: proofMethod === 'SOCIAL' ? verificationCode : undefined,
        telegramUsername: proofMethod === 'TELEGRAM' ? telegramUsername.trim() : undefined,
        otherProofText: proofMethod === 'OTHER' ? otherProofText.trim() : undefined,
        additionalInfo: additionalInfo.trim() || undefined,
        criteriaSnapshot: {
          monthlyPlays: criteria.monthlyPlays,
          approvedReleasesCount: criteria.approvedReleasesCount,
          uniqueListeners: criteria.uniqueListeners,
          hasProfileFilled: criteria.isProfileMet
        }
      });
      // The component will naturally re-render into the Status/Timeline screen because myRequest will now be defined!
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER: STATUS & TIMELINE SCREEN ---
  const renderStatusScreen = () => {
    const status = myRequest?.status || 'PENDING';
    
    // Status text & colors
    let statusLabel = 'Ожидает рассмотрения';
    let statusDesc = 'Заявка отправлена и ожидает очереди на проверку модератором.';
    let statusBadgeClass = 'bg-amber-500/15 border-amber-500/30 text-amber-400';

    if (status === 'IN_REVIEW') {
      statusLabel = 'На рассмотрении';
      statusDesc = 'Модератор начал проверку предоставленных данных и подтверждений.';
      statusBadgeClass = 'bg-blue-500/15 border-blue-500/30 text-blue-400';
    } else if (status === 'APPROVED') {
      statusLabel = 'Одобрено';
      statusDesc = 'Поздравляем! Ваш профиль верифицирован. Вы получили синюю галочку и возможность попадания в Huevify Daily Top 25.';
      statusBadgeClass = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
    } else if (status === 'REJECTED') {
      statusLabel = 'Отклонено';
      statusDesc = myRequest?.rejectionReason 
        ? `Причина отклонения: ${myRequest.rejectionReason}`
        : 'Заявка была отклонена модератором.';
      statusBadgeClass = 'bg-rose-500/15 border-rose-500/30 text-rose-400';
    }

    // Timeline calculation
    // Steps: 1. Заявка отправлена -> 2. Ожидает рассмотрения -> 3. На рассмотрении -> 4. Результат
    const getTimelineStepState = (stepIndex: number): 'completed' | 'active' | 'upcoming' => {
      if (status === 'APPROVED' || status === 'REJECTED') {
        return 'completed'; // all up to result
      }
      if (status === 'IN_REVIEW') {
        if (stepIndex <= 2) return 'completed';
        if (stepIndex === 3) return 'active';
        return 'upcoming';
      }
      // PENDING
      if (stepIndex === 1) return 'completed';
      if (stepIndex === 2) return 'active';
      return 'upcoming';
    };

    return (
      <div className="flex flex-col items-center max-w-2xl mx-auto w-full py-4 sm:py-8 px-4 animate-fade-in">
        {/* Animated Hourglass Header */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-2xl">
            {status === 'APPROVED' ? (
              <span className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                <Check size={36} strokeWidth={3} />
              </span>
            ) : status === 'REJECTED' ? (
              <span className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-lg">
                <X size={36} strokeWidth={2.5} />
              </span>
            ) : (
              <Hourglass size={42} className="text-primary animate-hourglass" strokeWidth={1.8} />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-2 tracking-tight">
          {status === 'APPROVED' ? 'Артист подтвержден' : status === 'REJECTED' ? 'Заявка отклонена' : 'Заявка отправлена'}
        </h2>

        {/* Current status badge */}
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-bold mb-4 shadow-sm ${statusBadgeClass}`}>
          {status === 'APPROVED' ? (
            <CheckCircle size={15} />
          ) : status === 'REJECTED' ? (
            <XCircle size={15} />
          ) : (
            <Clock size={15} />
          )}
          <span>{statusLabel}</span>
        </div>

        {/* Status description */}
        <p className="text-zinc-300 text-sm sm:text-base text-center max-w-md mb-8 leading-relaxed">
          {statusDesc}
        </p>

        {/* Rejection Cooldown Alert */}
        {status === 'REJECTED' && !canReapplyAfterCooldown && (
          <div className="w-full bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-8 text-center text-rose-300 text-xs sm:text-sm font-medium">
            Повторная подача заявки станет доступна через <span className="font-bold text-white">{daysRemaining} дн.</span> (правило 30 дней)
          </div>
        )}

        {/* Timeline */}
        <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6 mb-8 backdrop-blur-xl">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-5">
            Тайм-лайн рассмотрения
          </h3>

          <div className="relative flex flex-col gap-6">
            {/* Step 1: Заявка отправлена */}
            <div className="flex items-start gap-3.5 relative">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                  <Check size={14} strokeWidth={3} />
                </div>
                <div className="w-0.5 h-10 bg-emerald-500/40 my-1" />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="font-bold text-sm text-white flex items-center justify-between">
                  <span>Заявка отправлена</span>
                  {myRequest?.submittedAt && (
                    <span className="text-xs text-zinc-400 font-normal">
                      {new Date(myRequest.submittedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">Анкета успешно принята системой</div>
              </div>
            </div>

            {/* Step 2: Ожидает рассмотрения */}
            <div className="flex items-start gap-3.5 relative">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                  getTimelineStepState(2) === 'completed'
                    ? 'bg-emerald-500 text-black'
                    : getTimelineStepState(2) === 'active'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm animate-pulse'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {getTimelineStepState(2) === 'completed' ? <Check size={14} strokeWidth={3} /> : '2'}
                </div>
                <div className={`w-0.5 h-10 my-1 transition ${
                  getTimelineStepState(2) === 'completed' ? 'bg-emerald-500/40' : 'bg-white/10'
                }`} />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="font-bold text-sm text-white">Ожидает рассмотрения</div>
                <div className="text-xs text-zinc-400 mt-0.5">Заявка находится в очереди модерации</div>
              </div>
            </div>

            {/* Step 3: На рассмотрении */}
            <div className="flex items-start gap-3.5 relative">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                  getTimelineStepState(3) === 'completed'
                    ? 'bg-emerald-500 text-black'
                    : getTimelineStepState(3) === 'active'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm animate-pulse'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {getTimelineStepState(3) === 'completed' ? <Check size={14} strokeWidth={3} /> : '3'}
                </div>
                <div className={`w-0.5 h-10 my-1 transition ${
                  getTimelineStepState(3) === 'completed' ? 'bg-emerald-500/40' : 'bg-white/10'
                }`} />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="font-bold text-sm text-white">На рассмотрении</div>
                <div className="text-xs text-zinc-400 mt-0.5">Модератор проверяет код и полномочия</div>
              </div>
            </div>

            {/* Step 4: Результат */}
            <div className="flex items-start gap-3.5 relative">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                  status === 'APPROVED'
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                    : status === 'REJECTED'
                    ? 'bg-rose-500 text-white'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {status === 'APPROVED' ? <Check size={14} strokeWidth={3.5} /> : status === 'REJECTED' ? <X size={14} strokeWidth={3} /> : '4'}
                </div>
              </div>
              <div className="flex-1 pt-0.5">
                <div className="font-bold text-sm text-white">
                  {status === 'APPROVED' ? 'Результат: Одобрено' : status === 'REJECTED' ? 'Результат: Отклонено' : 'Результат'}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {status === 'APPROVED' 
                    ? 'Статус верифицированного артиста присвоен' 
                    : status === 'REJECTED' 
                    ? 'Заявка не прошла проверку модератором' 
                    : 'Ожидается финальное решение модератора'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Snapshot Card */}
        {myRequest && (
          <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-8 text-xs text-zinc-300 flex flex-col gap-3">
            <div className="font-bold text-sm text-white mb-1">Данные поданной заявки</div>
            
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-zinc-400">Кого вы представляете:</span>
              <span className="font-semibold text-white">
                {myRequest.applicantRole === 'ARTIST' && 'Я сам артист'}
                {myRequest.applicantRole === 'REPRESENTATIVE' && 'Представитель артиста'}
                {myRequest.applicantRole === 'CATALOG_MANAGER' && 'Управление каталогом'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-zinc-400">Способ подтверждения:</span>
              <span className="font-semibold text-white">
                {myRequest.proofMethod === 'SOCIAL' && 'Через соц. сети'}
                {myRequest.proofMethod === 'TELEGRAM' && 'Через ЛС в Telegram'}
                {myRequest.proofMethod === 'OTHER' && 'Другой способ'}
              </span>
            </div>

            {myRequest.proofMethod === 'SOCIAL' && myRequest.verificationCode && (
              <div className="flex flex-col gap-1.5 py-1.5 bg-white/[0.04] p-3 rounded-xl border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Проверочный код:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary tracking-widest text-sm">{myRequest.verificationCode}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(myRequest.verificationCode || '');
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="text-zinc-400 hover:text-white p-1 rounded"
                      title="Скопировать"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Код должен быть размещен в канале: {myRequest.socialLink}
                </div>
              </div>
            )}

            {myRequest.proofMethod === 'TELEGRAM' && myRequest.telegramUsername && (
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-zinc-400">Telegram:</span>
                <span className="font-semibold text-white">{myRequest.telegramUsername}</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center gap-3 w-full">
          {canReapplyAfterCooldown && (
            <button
              onClick={handleStartNewApplication}
              className="flex-1 bg-primary hover:bg-emerald-400 text-black font-bold py-3 px-4 rounded-xl transition text-sm text-center shadow-lg active:scale-95"
            >
              Подать новую заявку
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold py-3 px-4 rounded-xl transition text-sm text-center active:scale-95"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  };

  // --- RENDER: MULTI-STEP FORM ---
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-2xl flex flex-col page-enter">
      {/* Top Navbar */}
      <div className="sticky top-0 z-20 w-full bg-[#121215]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step > 1 && !hasActiveRequest) {
                setStep((step - 1) as any);
              } else {
                onClose();
              }
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition active:scale-90"
            title="Назад"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Shield size={14} />
            </span>
            <span className="font-bold text-sm sm:text-base text-white">Верификация артиста</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition active:scale-90"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 max-w-3xl mx-auto w-full">
        {hasActiveRequest ? (
          renderStatusScreen()
        ) : (
          <>
            {/* Step Indicator Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-3 text-xs sm:text-sm font-semibold text-zinc-400">
                <span className={step >= 1 ? 'text-white' : ''}>1. Кого представляете</span>
                <span className={step >= 2 ? 'text-white' : ''}>2. О себе</span>
                <span className={step >= 3 ? 'text-white' : ''}>3. Проверка</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* STEP 1: Кого вы представляете? */}
            {step === 1 && (
              <div className="flex flex-col gap-6 animate-slide-up">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                    Кого вы представляете?
                  </h1>
                  <p className="text-zinc-400 text-sm">
                    Выберите статус вашего взаимодействия с профилем исполнителя в Huevify.
                  </p>
                </div>

                <div className="flex flex-col gap-3.5">
                  {/* Option 1: Я сам артист */}
                  <div
                    onClick={() => setApplicantRole('ARTIST')}
                    className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
                      applicantRole === 'ARTIST'
                        ? 'bg-white/10 border-white/40 shadow-lg'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      applicantRole === 'ARTIST' ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'
                    }`}>
                      <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-white">Я сам артист</div>
                      <div className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        Подтверждаю собственный профиль.
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      applicantRole === 'ARTIST' ? 'border-white bg-white text-black' : 'border-white/20'
                    }`}>
                      {applicantRole === 'ARTIST' && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Option 2: Я представитель артиста */}
                  <div
                    onClick={() => setApplicantRole('REPRESENTATIVE')}
                    className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
                      applicantRole === 'REPRESENTATIVE'
                        ? 'bg-white/10 border-white/40 shadow-lg'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      applicantRole === 'REPRESENTATIVE' ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'
                    }`}>
                      <Users size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-white">Я представитель артиста</div>
                      <div className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        Менеджер или человек с разрешением артиста.
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      applicantRole === 'REPRESENTATIVE' ? 'border-white bg-white text-black' : 'border-white/20'
                    }`}>
                      {applicantRole === 'REPRESENTATIVE' && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Option 3: Я управляю каталогом артиста */}
                  <div
                    onClick={() => setApplicantRole('CATALOG_MANAGER')}
                    className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
                      applicantRole === 'CATALOG_MANAGER'
                        ? 'bg-white/10 border-white/40 shadow-lg'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      applicantRole === 'CATALOG_MANAGER' ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'
                    }`}>
                      <Disc size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-white">Я управляю каталогом артиста.</div>
                      <div className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        Хочу подтвердить права на уже существующий профиль.
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      applicantRole === 'CATALOG_MANAGER' ? 'border-white bg-white text-black' : 'border-white/20'
                    }`}>
                      {applicantRole === 'CATALOG_MANAGER' && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleNextToStep2}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-sm bg-primary hover:bg-emerald-400 text-black shadow-lg shadow-primary/20 transition active:scale-95"
                  >
                    Продолжить
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Расскажите о себе */}
            {step === 2 && (
              <div className="flex flex-col gap-6 animate-slide-up">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                    Расскажите о себе
                  </h1>
                  <p className="text-zinc-400 text-sm">
                    Заполните данные для проверки подлинности и проверьте выполнение критериев.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Field 1: Имя артиста в Huevify */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Имя артиста в Huevify
                    </label>
                    <input
                      type="text"
                      value={artistNameInput}
                      onChange={e => setArtistNameInput(e.target.value)}
                      placeholder="Например, MORGENSHTERN"
                      className="bg-white/[0.04] border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition"
                    />
                    {artistNameInput.trim().toLowerCase() === currentArtist.artistName.trim().toLowerCase() ? (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Check size={12} /> Имя совпадает с вашим текущим профилем
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1 mt-0.5">
                        <AlertCircle size={12} /> Имя должно совпадать с профилем ({currentArtist.artistName})
                      </span>
                    )}
                  </div>

                  {/* Field 2: Способ подтверждения */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Как вы можете подтвердить свою личность / показать свое подтверждение?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setProofMethod('SOCIAL')}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                          proofMethod === 'SOCIAL'
                            ? 'bg-white/15 border-white text-white shadow-sm'
                            : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span>Через соц. сети</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProofMethod('TELEGRAM')}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                          proofMethod === 'TELEGRAM'
                            ? 'bg-white/15 border-white text-white shadow-sm'
                            : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span>ЛС с модератором в Telegram</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProofMethod('OTHER')}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                          proofMethod === 'OTHER'
                            ? 'bg-white/15 border-white text-white shadow-sm'
                            : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span>Другой способ</span>
                      </button>
                    </div>

                    {/* Method details */}
                    {proofMethod === 'SOCIAL' && (
                      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 mt-1">
                        <label className="text-xs font-bold text-zinc-300">
                          Ссылка на канал или сообщество артиста
                        </label>
                        <input
                          type="text"
                          value={socialLink}
                          onChange={e => setSocialLink(e.target.value)}
                          placeholder="https://t.me/artist_channel или https://vk.com/artist"
                          className="bg-black/40 border border-white/10 focus:border-white/30 rounded-xl px-4 py-2.5 text-white text-xs sm:text-sm focus:outline-none transition"
                        />

                        {/* Special Code Warning Box - Neutral styled */}
                        <div className="bg-white/[0.04] border border-white/15 rounded-xl p-3.5 flex flex-col gap-2 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-200">Специальный проверочный код:</span>
                            <button
                              type="button"
                              onClick={handleCopyCode}
                              className="text-xs font-semibold bg-white/10 hover:bg-white/15 text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                            >
                              <Copy size={12} />
                              <span>{copiedCode ? 'Скопировано!' : 'Скопировать код'}</span>
                            </button>
                          </div>
                          <div className="text-xl sm:text-2xl font-mono font-black text-white tracking-widest bg-black/40 p-2.5 rounded-lg text-center border border-white/10 select-all">
                            {verificationCode}
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Опубликуйте этот код отдельным постом в вашем канале или укажите его в описании канала на время рассмотрения заявки модератором. Не удаляйте его до завершения верификации.
                          </p>
                        </div>
                      </div>
                    )}

                    {proofMethod === 'TELEGRAM' && (
                      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 mt-1">
                        <label className="text-xs font-bold text-zinc-300">
                          Ваш юзернейм в Telegram
                        </label>
                        <input
                          type="text"
                          value={telegramUsername}
                          onChange={e => setTelegramUsername(e.target.value)}
                          placeholder="@username"
                          className="bg-black/40 border border-white/10 focus:border-white/30 rounded-xl px-4 py-2.5 text-white text-xs sm:text-sm focus:outline-none transition"
                        />
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Модератор свяжется с вами в Telegram для подтверждения прав владения профилем.
                        </p>
                      </div>
                    )}

                    {proofMethod === 'OTHER' && (
                      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 mt-1">
                        <label className="text-xs font-bold text-zinc-300">
                          Опишите ваш способ подтверждения
                        </label>
                        <textarea
                          rows={3}
                          value={otherProofText}
                          onChange={e => setOtherProofText(e.target.value)}
                          placeholder="Укажите альтернативный способ, ссылки на договоры или официальные контакты..."
                          className="bg-black/40 border border-white/10 focus:border-white/30 rounded-xl p-3 text-white text-xs sm:text-sm focus:outline-none transition resize-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Field 3: Дополнительная информация */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Дополнительная информация (необязательно)
                    </label>
                    <textarea
                      rows={2}
                      value={additionalInfo}
                      onChange={e => setAdditionalInfo(e.target.value)}
                      placeholder="Любая важная информация для модератора..."
                      className="bg-white/[0.04] border border-white/10 focus:border-white/30 rounded-xl p-3 text-white text-sm focus:outline-none transition resize-none"
                    />
                  </div>

                  {/* Field 4: Проверка критериев */}
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                        Проверка критериев
                      </span>
                      {criteria.isAllMet ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Check size={14} /> Все критерии выполнены
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                          <AlertCircle size={14} /> Не все критерии выполнены
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {/* Criterion 1: 300 000 plays */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            criteria.isPlaysMet ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {criteria.isPlaysMet ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                          </span>
                          <span className="text-xs sm:text-sm text-zinc-200">
                            Не менее 300 000 прослушиваний за последние 30 дней
                          </span>
                        </div>
                        <span className={`text-xs font-mono font-bold shrink-0 ml-2 ${
                          criteria.isPlaysMet ? 'text-emerald-400' : 'text-zinc-400'
                        }`}>
                          {formatNumber(criteria.monthlyPlays)} / 300 000
                        </span>
                      </div>

                      {/* Criterion 2: 3 approved releases */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            criteria.isReleasesMet ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {criteria.isReleasesMet ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                          </span>
                          <span className="text-xs sm:text-sm text-zinc-200">
                            Не менее 3 одобренных релизов
                          </span>
                        </div>
                        <span className={`text-xs font-mono font-bold shrink-0 ml-2 ${
                          criteria.isReleasesMet ? 'text-emerald-400' : 'text-zinc-400'
                        }`}>
                          {criteria.approvedReleasesCount} / 3
                        </span>
                      </div>

                      {/* Criterion 3: 2 unique listeners */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            criteria.isListenersMet ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {criteria.isListenersMet ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                          </span>
                          <span className="text-xs sm:text-sm text-zinc-200">
                            Не менее 2 уникальных слушателей
                          </span>
                        </div>
                        <span className={`text-xs font-mono font-bold shrink-0 ml-2 ${
                          criteria.isListenersMet ? 'text-emerald-400' : 'text-zinc-400'
                        }`}>
                          {criteria.uniqueListeners} / 2
                        </span>
                      </div>

                      {/* Criterion 4: Profile filled (avatar and bio) */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            criteria.isProfileMet ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {criteria.isProfileMet ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                          </span>
                          <span className="text-xs sm:text-sm text-zinc-200">
                            Профиль артиста заполнен (аватар и биография)
                          </span>
                        </div>
                        <span className={`text-xs font-bold shrink-0 ml-2 ${
                          criteria.isProfileMet ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {criteria.isProfileMet 
                            ? 'Заполнен' 
                            : !criteria.hasAvatar && !criteria.hasBio 
                            ? 'Нет аватара и био' 
                            : !criteria.hasAvatar 
                            ? 'Нет аватара' 
                            : 'Нет биографии'}
                        </span>
                      </div>

                      {/* Criterion 5: No severe violations (moderator manual check) */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                            <Info size={12} />
                          </span>
                          <span className="text-xs sm:text-sm text-zinc-300">
                            Нет серьёзных нарушений
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400 font-medium shrink-0 ml-2">
                          Проверяет модератор
                        </span>
                      </div>
                    </div>

                    {!criteria.isAllMet && (
                      <p className="text-xs text-rose-300/90 leading-relaxed mt-1">
                        Для подачи заявки необходимо выполнить все критерии (кроме проверки нарушений модератором).
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3 rounded-full font-bold text-xs sm:text-sm bg-white/5 hover:bg-white/10 text-white transition active:scale-95"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    disabled={!isStep2Valid()}
                    onClick={handleNextToStep3}
                    className={`px-8 py-3.5 rounded-full font-bold text-sm transition active:scale-95 ${
                      isStep2Valid()
                        ? 'bg-primary hover:bg-emerald-400 text-black shadow-lg shadow-primary/20'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    Продолжить
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Проверьте данные */}
            {step === 3 && (
              <div className="flex flex-col gap-6 animate-slide-up">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                    Проверьте данные
                  </h1>
                  <p className="text-zinc-400 text-sm">
                    Убедитесь в правильности указанных сведений перед отправкой модераторам.
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
                  {/* Role */}
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs font-semibold text-zinc-400">Кого вы представляете:</span>
                    <span className="font-bold text-sm text-white">
                      {applicantRole === 'ARTIST' && 'Я сам артист'}
                      {applicantRole === 'REPRESENTATIVE' && 'Я представитель артиста'}
                      {applicantRole === 'CATALOG_MANAGER' && 'Я управляю каталогом артиста'}
                    </span>
                  </div>

                  {/* Artist Name */}
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs font-semibold text-zinc-400">Имя артиста в Huevify:</span>
                    <span className="font-bold text-sm text-white">{artistNameInput}</span>
                  </div>

                  {/* Proof Method */}
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs font-semibold text-zinc-400">Способ подтверждения:</span>
                    <span className="font-bold text-sm text-white">
                      {proofMethod === 'SOCIAL' && 'Через соц. сети'}
                      {proofMethod === 'TELEGRAM' && 'ЛС в Telegram'}
                      {proofMethod === 'OTHER' && 'Другой способ'}
                    </span>
                  </div>

                  {/* Proof Details */}
                  {proofMethod === 'SOCIAL' && (
                    <div className="flex flex-col gap-2 py-2 border-b border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-zinc-400">Ссылка на канал:</span>
                        <span className="text-xs font-medium text-white truncate max-w-[240px]">
                          {socialLink}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white/[0.04] p-2.5 rounded-xl border border-white/10">
                        <span className="text-xs text-zinc-300">Проверочный код:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-primary tracking-wider">{verificationCode}</span>
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="text-xs text-zinc-400 hover:text-white p-1"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {proofMethod === 'TELEGRAM' && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs font-semibold text-zinc-400">Telegram username:</span>
                      <span className="font-bold text-sm text-white">{telegramUsername}</span>
                    </div>
                  )}

                  {proofMethod === 'OTHER' && (
                    <div className="flex flex-col gap-1 py-2 border-b border-white/5">
                      <span className="text-xs font-semibold text-zinc-400">Описание способа:</span>
                      <span className="text-xs text-zinc-200 whitespace-pre-wrap">{otherProofText}</span>
                    </div>
                  )}

                  {/* Additional info */}
                  {additionalInfo && (
                    <div className="flex flex-col gap-1 py-2 border-b border-white/5">
                      <span className="text-xs font-semibold text-zinc-400">Дополнительно:</span>
                      <span className="text-xs text-zinc-300 whitespace-pre-wrap">{additionalInfo}</span>
                    </div>
                  )}

                  {/* Criteria check summary */}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-semibold text-zinc-400">Проверка критериев:</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check size={14} /> Все критерии соблюдены
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 rounded-full font-bold text-xs sm:text-sm bg-white/5 hover:bg-white/10 text-white transition active:scale-95"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="px-8 py-3.5 rounded-full font-bold text-sm bg-primary hover:bg-emerald-400 text-black shadow-lg shadow-primary/20 transition active:scale-95 flex items-center gap-2"
                  >
                    {isSubmitting ? 'Отправка...' : 'Отправить данные'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
