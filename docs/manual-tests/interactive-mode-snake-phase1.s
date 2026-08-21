# Snake game — Phase 1: continuously-moving, fixed-length snake.
#
# No food, no growth, no collision/game-over logic yet. A body of N=4
# segments moves one cell per game step in the current direction; arrow
# keys change the direction at any time. The grid wraps around at all
# four edges instead of stopping.
#
# Movement is driven purely by the interpreter's tick loop (Settings ->
# Performance), not by a busy-wait inside the program: this keeps the
# per-tick instruction footprint low (see the runBatch note below).
# Recommended settings for a clean, visible pace: Execution speed =
# "Slow (100)" and Delay between cycles ~150ms. One game step is at
# most ~90 instructions (worst case: a key was pressed AND the
# direction dispatch falls through to the last branch), so 100
# instructions/tick reliably completes exactly one step per tick.
#
# Reversal edge case: turning directly into the segment behind the head
# is allowed (no direction-validity check). Phase 1 has no collision
# detection, so the body simply follows through the reversed head; this
# will be revisited once collision/game-over is implemented.
#
# Register roles (all persistent-across-ticks state lives in s-regs):
#   t0 = framebuffer base address (0xFF000000), loaded once
#   t1 = pixel color to write (0 = erase, -1 = white), scratch
#   t2 = computed pixel/array address, scratch, always used with a
#        0(reg) offset — the address itself is always fully computed
#        via add beforehand (RV32I's 12-bit signed immediate limit)
#   t3 = keyboard register address (0xFF010000), loaded once
#   t4 = key code read from the keyboard register, scratch
#   t5 = scratch comparison value
#   t6 = scratch (array byte offsets, loop temporaries)
#   a0/a1 = new head (x, y) being computed, scratch
#   a2/a3 = old tail (x, y), saved before the shift so it can be erased
#   a4/a5 = old head (x, y) = segX[0]/segY[0] before the shift
#   s1 = current direction: 0=up, 1=right, 2=down, 3=left (persistent)
#   s2 = base address of segX[] array (persistent, constant)
#   s3 = base address of segY[] array (persistent, constant)
#   s4 = N, number of segments = 4 (persistent, constant)
#   s5 = loop index, reused by the init-draw loop and the shift loop

.text
main:
    # ---- one-time setup: constants that never change across ticks ----
    li t0, -16777216       # t0 = 0xFF000000, framebuffer base
    li t3, -16711680       # t3 = 0xFF010000, keyboard register address

    la s2, segX
    la s3, segY
    li s4, 4                # N = 4 segments
    li s1, 1                 # start moving right

    # draw the initial body once, so the snake is visible before it
    # ever moves (otherwise nothing would appear until the first tick)
    li s5, 0
init_draw:
    slli t6, s5, 2
    add t2, s2, t6
    lw a4, 0(t2)             # a4 = segX[i]
    add t2, s3, t6
    lw a5, 0(t2)             # a5 = segY[i]
    slli t2, a5, 5           # t2 = y * 32
    add t2, t2, a4           # t2 = y * 32 + x
    slli t2, t2, 2           # t2 = word offset in bytes
    add t2, t2, t0           # t2 = pixel address
    li t1, -1
    sw t1, 0(t2)
    addi s5, s5, 1
    blt s5, s4, init_draw

tick:
    # ---- read the keyboard; a non-zero code updates the direction ----
    lw t4, 0(t3)
    beqz t4, move_step

    li t5, 38
    beq t4, t5, set_up
    li t5, 40
    beq t4, t5, set_down
    li t5, 37
    beq t4, t5, set_left
    li t5, 39
    beq t4, t5, set_right
    j consume_key

set_up:
    li s1, 0
    j consume_key
set_down:
    li s1, 2
    j consume_key
set_left:
    li s1, 3
    j consume_key
set_right:
    li s1, 1

consume_key:
    sw x0, 0(t3)              # signal the key was consumed

move_step:
    # a4/a5 = current head = segX[0]/segY[0]
    lw a4, 0(s2)
    lw a5, 0(s3)

    # a2/a3 = current tail (segment N-1), saved for erasing later
    addi t6, s4, -1
    slli t6, t6, 2
    add t2, s2, t6
    lw a2, 0(t2)
    add t2, s3, t6
    lw a3, 0(t2)

    # shift the body: for i = N-1 downto 1, seg[i] = seg[i-1]
    addi s5, s4, -1
shift_loop:
    beqz s5, shift_done
    slli t6, s5, 2
    addi t5, t6, -4
    add t2, s2, t5
    lw a0, 0(t2)
    add t2, s3, t5
    lw a1, 0(t2)
    add t2, s2, t6
    sw a0, 0(t2)
    add t2, s3, t6
    sw a1, 0(t2)
    addi s5, s5, -1
    j shift_loop
shift_done:

    # compute the new head from the old head + current direction,
    # wrapping around the 32x18 grid at the edges
    li t5, 0
    beq s1, t5, move_up
    li t5, 1
    beq s1, t5, move_right
    li t5, 2
    beq s1, t5, move_down
    j move_left

move_up:
    addi a0, a5, -1
    bgez a0, up_ok
    li a0, 17
up_ok:
    mv a1, a0
    mv a0, a4
    j apply_head

move_down:
    addi a1, a5, 1
    li t5, 18
    blt a1, t5, down_ok
    li a1, 0
down_ok:
    mv a0, a4
    j apply_head

move_left:
    addi a0, a4, -1
    bgez a0, left_ok
    li a0, 31
left_ok:
    mv a1, a5
    j apply_head

move_right:
    addi a0, a4, 1
    li t5, 32
    blt a0, t5, right_ok
    li a0, 0
right_ok:
    mv a1, a5

apply_head:
    sw a0, 0(s2)              # segX[0] = new head x
    sw a1, 0(s3)              # segY[0] = new head y

    # erase the pixel at the vacated tail position
    slli t2, a3, 5
    add t2, t2, a2
    slli t2, t2, 2
    add t2, t2, t0
    li t1, 0
    sw t1, 0(t2)

    # draw the pixel at the new head position
    slli t2, a1, 5
    add t2, t2, a0
    slli t2, t2, 2
    add t2, t2, t0
    li t1, -1
    sw t1, 0(t2)

    j tick

.data
segX: .word 10, 9, 8, 7
segY: .word 9, 9, 9, 9
