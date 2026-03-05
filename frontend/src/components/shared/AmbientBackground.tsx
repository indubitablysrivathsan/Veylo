export default function AmbientBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div
                className="absolute rounded-full blur-[120px] orb-1"
                style={{
                    width: 520, height: 520,
                    top: '10%', left: '-8%',
                    background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
                }}
            />
            <div
                className="absolute rounded-full blur-[140px] orb-2"
                style={{
                    width: 640, height: 640,
                    top: '45%', right: '2%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)',
                }}
            />
            <div
                className="absolute rounded-full blur-[100px] orb-3"
                style={{
                    width: 380, height: 380,
                    bottom: '8%', left: '28%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                }}
            />
        </div>
    )
}
