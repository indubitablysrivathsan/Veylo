export default function Aurora() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Primary violet layer */}
            <div
                className="absolute aurora-layer"
                style={{
                    width: 700,
                    height: 700,
                    top: '-5%',
                    left: '-10%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 65%)',
                    filter: 'blur(80px)',
                }}
            />
            {/* Secondary indigo layer */}
            <div
                className="absolute aurora-layer"
                style={{
                    width: 800,
                    height: 800,
                    top: '30%',
                    right: '-5%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)',
                    filter: 'blur(100px)',
                    animationDelay: '-10s',
                    animationDuration: '40s',
                }}
            />
            {/* Tertiary violet layer */}
            <div
                className="absolute aurora-layer"
                style={{
                    width: 500,
                    height: 500,
                    bottom: '5%',
                    left: '25%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)',
                    filter: 'blur(90px)',
                    animationDelay: '-20s',
                    animationDuration: '35s',
                }}
            />
        </div>
    )
}
