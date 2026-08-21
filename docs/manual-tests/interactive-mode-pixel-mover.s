.text
main:
    # s1 = current pixel column (x), persists across loop iterations
    # s2 = current pixel row (y), persists across loop iterations
    li s1, 16
    li s2, 9

    # t3 = keyboard register address (0xFF010000), fixed for the whole run
    li t3, -16711680

    # t0 = framebuffer base address (0xFF000000)
    li t0, -16777216

    # draw the initial pixel before waiting for any key, so something
    # is visible immediately after Assemble/Run
    slli t2, s2, 5
    add  t2, t2, s1
    slli t2, t2, 2
    add  t2, t2, t0
    li   t1, -1
    sw   t1, 0(t2)

loop:
    # t4 = last key code written by the panel; 0 means no pending key
    lw t4, 0(t3)
    beqz t4, loop

    # t0 = framebuffer base address (0xFF000000)
    # t2 = computed final address of the pixel currently on screen
    li t0, -16777216
    slli t2, s2, 5
    add t2, t2, s1
    slli t2, t2, 2
    add t2, t2, t0

    # t1 = color to write; erase the pixel at the current position first
    li t1, 0
    sw t1, 0(t2)

    # ArrowLeft = 37, ArrowRight = 39, ArrowUp = 38, ArrowDown = 40
    li t5, 37
    beq t4, t5, move_left
    li t5, 39
    beq t4, t5, move_right
    li t5, 38
    beq t4, t5, move_up
    li t5, 40
    beq t4, t5, move_down
    j draw

move_left:
    addi s1, s1, -1
    j wrap_check
move_right:
    addi s1, s1, 1
    j wrap_check
move_up:
    addi s2, s2, -1
    j wrap_check
move_down:
    addi s2, s2, 1
    j wrap_check

wrap_check:
    # wrap x: if s1 went below 0, jump to the right edge (31);
    # if it went past 31, jump to the left edge (0)
    bgez s1, wrap_check_x_high
    li   s1, 31
    j    wrap_check_y
wrap_check_x_high:
    li   t5, 31
    ble  s1, t5, wrap_check_y
    li   s1, 0

wrap_check_y:
    # wrap y: if s2 went below 0, jump to the bottom edge (17);
    # if it went past 17, jump to the top edge (0)
    bgez s2, wrap_check_y_high
    li   s2, 17
    j    draw
wrap_check_y_high:
    li   t5, 17
    ble  s2, t5, draw
    li   s2, 0

draw:
    # recompute t2 for the (possibly updated) position and light it up
    li t0, -16777216
    slli t2, s2, 5
    add t2, t2, s1
    slli t2, t2, 2
    add t2, t2, t0

    li t1, -1
    sw t1, 0(t2)

    # signal the key was consumed, as required by the panel's contract
    sw x0, 0(t3)
    j loop